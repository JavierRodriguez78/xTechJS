# Hallazgo técnico: bug de arranque de la API en producción (`make up`)

## Síntoma
`docker compose up --build` construye correctamente las 4 imágenes, Postgres y Redis quedan `Healthy`, pero el contenedor `api` muere a los pocos segundos:
```
✘ Container xtechjs-api-1 Error dependency api failed to start
dependency failed to start: container xtechjs-api-1 exited (1)
```
El log interno del contenedor (reproducido en local) muestra:
```
Error: No component found with name: userRepository
```

## Causa raíz (confirmada, no es una hipótesis)

`@xtaskjs/core` decide qué archivos importar/registrar en el contenedor de inyección de dependencias mediante un **worker de "discovery"** que hace un filtrado por texto ANTES de importar cada fichero candidato (`Container.discoveryWorkerSource` en `di/container.js`). El filtro es este regex:

```js
/(@Service\b|@Component\b|@Controller\b|\bService\s*\(|\bComponent\s*\(|\bController\s*\(|CONTROLLERS_KEY|getComponentMetadata)/
```

**Este regex no contiene la palabra `Repository` en ninguna de sus alternativas.** Es decir: cualquier clase que se registre únicamente mediante el decorador `@Repository(...)` de `@xtaskjs/core` (usado como `@XTaskRepository` en `postgres-user-repository.ts`) **nunca pasa el filtro de discovery**, por lo que su decorador nunca llega a ejecutarse en el flujo de registro (`registerWithName`) y el componente nunca se añade al mapa `nameToType` del contenedor — aunque el fichero SÍ figure en el manifiesto prebuilt y SÍ se haya importado en otro punto de la app (p. ej. desde `main.ts`). Importar la clase en otro fichero solo fija metadatos (`Reflect.defineMetadata`) vía el decorador; **no** la registra — solo el discovery hace `registerWithName(...)`.

### Verificación empírica realizada
1. Se reprodujo el stack completo (Postgres + Redis reales, mismas env vars que `compose.yaml`) en un entorno local, replicando exactamente los pasos del `Dockerfile` (`pnpm deploy --legacy --prod`, `prebuild-xtask-manifest.mjs`, `rm -rf src`, arranque con `node dist/main.js`).
2. Se confirmó con grep que `postgres-user-repository.js` **no contiene ninguna de las cadenas del regex** (`Service(`, `Component(`, `Controller(`, etc.).
3. Se añadió temporalmente un comentario `// @Service()` al inicio del fichero compilado (sin tocar la lógica) — **con ese único cambio, `PostgresUserRepository` se registra correctamente** (`Registering component: PostgresUserRepository...`) y la API arranca, conecta a Postgres/Redis y responde `200 OK` en `/health`.

### Por qué solo falla `userRepository` y no `customers`/`repairs`
`PostgresCustomerRepository`, `PostgresRepairOrderRepository` y `PostgresRepairQuoteRepository` **no pasan por el contenedor de xtaskjs**: se instancian manualmente con `new ...Repository(dataSource)` directamente en `main.ts`, así que no dependen del discovery. Solo `AuthenticationService`, `ListUsers` y `ListTechnicians` dependen de `@Qualifier("userRepository")`, que exige que el contenedor tenga el componente registrado por nombre — de ahí que el único punto de fallo visible sea `userRepository`.

## Patrón de referencia: cómo lo resuelve `xGestoria` (mismo framework, mismo problema, ya solucionado)

Revisado `https://github.com/JavierRodriguez78/xGestoria/tree/main/backend`. Su repositorio equivalente (`typeorm-usuario.repository.ts`) **nunca usa el decorador `@Repository`/`@XTaskRepository`**. Usa siempre `@Service({ scope: "singleton" })` para TODO lo que debe vivir en el contenedor DI — incluidos los repositorios — e inyecta el `DataSource` por propiedad con `@InjectDataSource()`:

```ts
import { Service } from "@xtaskjs/core";
import { DataSource, Repository } from "@xtaskjs/typeorm";
import { InjectDataSource } from "@xtaskjs/typeorm";

@Service({ scope: "singleton" })
export class TypeOrmUsuarioRepository implements IUsuarioRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  constructor(private readonly eventStore: EventStore) {}

  private get repo() {
    return this.dataSource.getRepository(UsuarioEntity);
  }
  // ...
}
```

Esto evita el bug de raíz: `@Service(...)` sí coincide con el regex del discovery worker, así que la clase se registra siempre, sin depender de si algún otro fichero la importa antes.

## Fix recomendado para `xTechJS` (mínimo, sin tocar arquitectura)

En `apps/api/src/users/infrastructure/persistence/postgres-user-repository.ts`, sustituir:
```ts
import { Repository as XTaskRepository } from "@xtaskjs/core";
...
@XTaskRepository({ name: "userRepository" })
export class PostgresUserRepository implements UserRepository { ... }
```
por el patrón de `xGestoria`:
```ts
import { Service } from "@xtaskjs/core";
...
@Service({ name: "userRepository" })
export class PostgresUserRepository implements UserRepository { ... }
```
(si `@Service` de esta versión de `@xtaskjs/core` no admite `name` en las opciones, usar `@Qualifier`/registro por nombre tal como haga `@Service` en la versión instalada — comprobar la firma exacta del decorador en `node_modules/@xtaskjs/core`).

## Recomendación de fondo (aplica a todo el proyecto, no solo a este bug)

Como regla general para **todos los repositorios y adaptadores de infraestructura de xTechJS** (no solo `users`): usar siempre `@Service(...)` para cualquier clase que deba resolverse vía el contenedor de xtaskjs, y reservar el patrón de instanciación manual (`new XxxRepository(dataSource)`) solo para casos explícitamente fuera del contenedor. Esto evita reproducir este mismo bug en `customers`, `repairs`, `almacen`, `tpv`, etc. a medida que esos módulos empiecen a depender también del contenedor DI (por ejemplo, si en el futuro se decide inyectar `PostgresCustomerRepository` en un `CommandHandler` de CQRS en vez de instanciarlo a mano).

## Petición para ChatGPT

1. Aplicar el fix anterior en `postgres-user-repository.ts` (y revisar si hay algún otro `@Repository`/`@XTaskRepository` en el código, aunque en el estado actual del repo solo aparece en `users`).
2. Añadir un test de arranque (smoke test) que levante el `Kernel` de xtaskjs con `resolutionStrategy: "eager"` en modo test/CI y falle explícitamente si algún componente requerido no se resuelve — para detectar este tipo de bug en CI antes de llegar a `docker compose up`.
3. Revisar `apps/api/src/main.ts` para alinear el orden de arranque con el patrón de `xGestoria/backend/src/app.ts` (crear la app, obtener el contenedor, y solo entonces resolver los casos de uso), documentando explícitamente por qué xTechJS no necesita las llamadas a `initializeTypeOrmIntegration`/`initializeSecurityIntegration`/`initializeCqrsIntegration` que sí usa xGestoria (en la versión de paquetes instalada en xTechJS estas integraciones ya se resuelven automáticamente durante el bootstrap del `Kernel`).
