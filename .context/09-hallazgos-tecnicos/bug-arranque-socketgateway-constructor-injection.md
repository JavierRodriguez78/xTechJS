# Hallazgo técnico: un `@SocketGateway` no puede depender de nada respaldado por el datasource, ni por constructor ni por propiedad

> **Nota:** este documento sustituye una versión anterior cuyo diagnóstico (v2 más abajo) resultó
> incompleto — el fix propuesto entonces (`@Qualifier` como propiedad) parecía funcionar en el
> arranque pero en realidad dejaba las dependencias sin inyectar en absoluto, y solo se detectó al
> probar una conexión real de cliente. Se documentan las tres iteraciones para que quede constancia
> de por qué las dos primeras "soluciones" fallaron, y cuál es el fix correcto y verificado.

## Síntoma original
Al añadir el primer `@SocketGateway()` de xTechJS (`ChatGateway`, para el chat en tiempo real),
`docker compose up --build api` arrancaba el kernel de xTaskJS (`Kernel started successfully`) pero
el proceso lanzaba justo después:

```
Error: Failed to inject required dependency for property "dataSource": No component found with name: xtask:typeorm:datasource:default
```

y la API nunca llegaba a `Server listening`.

## v1 (incorrecto): inyección por constructor

```ts
constructor(
  @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
  @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository
) {}
```

Diagnóstico inicial: los gateways se instancian de forma **síncrona y eager** durante el arranque —
en concreto, `@xtaskjs/socket-io`'s `SocketIoLifecycleManager.discoverGateways()` llama a
`Container.get(ChatGateway)` desde `initializeSocketIoIntegration()`, invocada por
`registerContainerInLifecycle()`, **antes** de que `@xtaskjs/typeorm` registre el componente
`xtask:typeorm:datasource:default`. Pedir `customerRepository`/`repairOrderRepository` por
constructor fuerza su instanciación inmediata, y estos a su vez fuerzan la del datasource — que aún
no existe.

## v2 (incorrecto, aunque "parecía" funcionar): `@Qualifier` como decorador de propiedad

```ts
@Qualifier("customerRepository")
private readonly customerRepository!: CustomerRepository;
```

Este cambio hizo que la API arrancara sin error — pero **no porque la inyección se volviera
perezosa**, sino porque **`@Qualifier` de `@xtaskjs/core` es un no-op cuando se usa como decorador
de propiedad** (ver `di/qualifier.js`):

```js
function Qualifier(name) {
  return function (target, propertyKey, parameterIndex) {
    if (parameterIndex !== undefined) {
      // Parameter decorator — SOLO esta rama hace algo.
      ...
    }
    // Si es propiedad (parameterIndex === undefined), no registra ninguna metadata.
  };
}
```

Como no se registra metadata, `injectAutoWiredFields` (que recorre `getAutoWiredProperties`,
alimentada por el decorador **`@AutoWired`**, no por `@Qualifier`) nunca ve esas dos propiedades, y
`this.customerRepository`/`this.repairOrderRepository` quedan **`undefined` para siempre**. El
arranque "funcionaba" solo porque nunca se intentaba usar esas propiedades durante el arranque; el
bug real (acceso a `undefined.findByEmail`) solo se manifestó al conectar un cliente real
autenticado como `customer` y disparar `onConnect`, con este error:

```
TypeError: Cannot read properties of undefined (reading 'findByEmail')
```

**Lección:** `@InjectDataSource()` SÍ funciona como propiedad porque internamente usa
`AutoWired({ qualifier: token })`, no `@Qualifier` a secas (ver `@xtaskjs/typeorm/dist/cjs/decorators.js`). `@Qualifier` de `@xtaskjs/core` **solo es válido en parámetros de constructor** en
esta versión del framework — usarlo sobre una propiedad no lanza ningún error, simplemente no hace
nada, lo cual es mucho más peligroso que un fallo ruidoso.

## v3 (probado con `@AutoWired({ qualifier })` en propiedad): reproduce el bug original

Corregir v2 usando el decorador correcto para propiedades (`@AutoWired({ qualifier: "..." })` en
vez de `@Qualifier`) **reintroduce exactamente el crash de v1**, porque `injectAutoWiredFields`
también es síncrono y eager — se ejecuta justo después de `new target()` sin importar si el campo
se declaró con decorador de propiedad o de parámetro de constructor. La única razón por la que
`@InjectDataSource()` funciona en los repositorios normales es que esos repositorios **nunca se
instancian eager durante el arranque** (nada los fuerza antes de que llegue la primera petición
HTTP real); `ChatGateway` sí se fuerza eager por `discoverGateways()`, así que cualquier dependencia
suya respaldada por el datasource —directa o transitivamente— revienta igual, sea constructor o
propiedad.

## Fix definitivo (v4, verificado end-to-end)

`ChatGateway` **no declara ninguna dependencia gestionada por xtaskjs** (ni `@Qualifier` en
constructor, ni `@AutoWired`/`@Qualifier`/`@InjectDataSource` en propiedad). En su lugar, cada
manejador de evento resuelve el repositorio que necesita **bajo demanda**, tirando del contenedor
que ya viaja en el `context` de cada handler (`SocketHandlerContext.container`):

```ts
@Service()
@SocketGateway({ namespace: "/chat", group: ["chat"] })
export class ChatGateway {
  @OnSocketConnection()
  async onConnect(socket: Socket, context: SocketHandlerContext): Promise<void> {
    // ...
    const customer = await this.customerRepository(context).findByEmail(user.email ?? "");
    // ...
  }

  private customerRepository(context: SocketHandlerContext): CustomerRepository {
    return context.container!.getByName<CustomerRepository>("customerRepository");
  }

  private repairOrderRepository(context: SocketHandlerContext): RepairOrderRepository {
    return context.container!.getByName<RepairOrderRepository>("repairOrderRepository");
  }
}
```

Como `ChatGateway` en sí no tiene ninguna dependencia, su propia construcción (`new ChatGateway()`
dentro de `discoverGateways()`) es trivial e instantánea — no dispara ninguna cadena hacia el
datasource. Los repositorios solo se piden **la primera vez que un cliente real se conecta o envía
un evento** (`onConnect`/`chat.join`), momento muy posterior al arranque, cuando el datasource lleva
rato inicializado y esos repositorios ya están además cacheados como singleton (fueron resueltos
antes, durante el smoke check `assertRequiredComponents`, que sí corre después de que el datasource
esté listo y antes de `listen()`).

### Verificación empírica realizada
1. `pnpm --filter @xtechjs/api typecheck` y `pnpm --filter @xtechjs/api test` (21/21) en verde.
2. Reconstruido el contenedor `api` en Docker (`--no-cache` para descartar una capa cacheada
   obsoleta) — arranca, `Server listening` inmediato, `/health` en `200`.
3. **Prueba en vivo con un cliente Socket.IO real**: se firmó un JWT válido (mismo secreto que
   `@fastify/jwt`) para un cliente `customer` existente en la base de datos y se conectó al
   namespace `/chat` con `socket.io-client`. La conexión se aceptó sin crash del proceso (antes,
   con v3, esto tumbaba el proceso Node completo) y `chat.join` devolvió un ack coherente
   (`{ ok: false, error: "forbidden" }` para una reparación inexistente — comportamiento correcto).
4. Se detectó y corrigió además una **condición de carrera** cliente-servidor: el servidor solo
   registra el listener de `chat.join` después de que `onConnect` (asíncrono) termine, mientras que
   el evento `connect` del lado cliente puede dispararse antes de eso. El primer intento de unión a
   una sala justo tras conectar puede perderse. Se mitigó en el frontend
   (`apps/web/src/features/chat/ChatPanel.vue`) con reintento acotado usando ack
   (`socket.timeout(2000).emit("chat.join", ..., callback)`, hasta 3 reintentos) y re-unión
   automática en cada evento `connect` (incluidas reconexiones tras cortes de red).

## Recomendación de fondo (reemplaza la de las versiones anteriores)

**Ningún `@SocketGateway()` (ni, por extensión, ningún componente que un paquete de xTaskJS
instancie de forma eager durante el arranque, fuera del flujo normal de peticiones HTTP) debe
declarar dependencias gestionadas por el contenedor — ni por constructor ni por propiedad, con
ningún decorador (`@Qualifier`, `@AutoWired`, `@InjectDataSource`, etc.) — si esas dependencias
están respaldadas, directa o transitivamente, por el datasource.** La única forma segura de acceder
a esas dependencias desde una clase con este perfil de arranque es resolverlas bajo demanda dentro
de cada manejador de evento, usando el `container` disponible en el contexto que la propia librería
proporciona en tiempo de invocación (nunca en el constructor de la clase). Antes de dar por buena
una inyección "perezosa" en código de arranque temprano, **verificar con una prueba en vivo que
además de no romper el arranque, la dependencia queda realmente asignada** (una ausencia de error
en el log de arranque no es prueba suficiente, como demostró v2).

general ya identificada en `09-hallazgos-tecnicos/bug-arranque-userrepository.md` (usar siempre
`@Service(...)` para componentes DI) se amplía así: **la inyección por constructor de cualquier
dependencia que dependa del datasource solo es segura en clases que se instancian después de que
el datasource esté listo** (comandos/queries CQRS invocados vía `CommandBus`/`QueryBus` en
respuesta a peticiones HTTP reales, que siempre ocurren después de `listen()` y del smoke check).
Para gateways de Socket.IO, adjuntos por WebSocket, o cualquier otro componente de arranque
temprano, usar inyección por propiedad como patrón por defecto.
