# Hallazgo técnico: arranque colgado si el SMTP no está disponible (`verifyOnStart: true` del mailer)

## Síntoma
Con Postgres y Redis reales levantados pero **sin nada escuchando en el puerto SMTP**, la API:
- registra todos los componentes del contenedor DI,
- imprime `[xTaskjs] Kernel started successfully`,
- **nunca llega a imprimir `Server listening`**,
- no responde a ninguna petición (`curl` a `/health` devuelve conexión rechazada / timeout),
- no sale con código de error — el proceso queda colgado indefinidamente.

En el flujo documentado (`make up` / `docker compose up`) esto no se manifiesta porque `api`
depende de que `mailhog` esté `healthy` antes de arrancar. El riesgo real aparece en dos
escenarios fuera de ese flujo:
1. Alguien ejecuta la API en local (`make dev` o equivalente) sin levantar MailHog antes.
2. En producción, el servidor SMTP real (o la red hacia él) falla temporalmente al arrancar
   o reiniciar el contenedor `api` — un fallo de un servicio auxiliar (email) tira abajo la
   API completa, no solo el envío de correos.

## Causa raíz (confirmada, no es una hipótesis)

`apps/api/src/shared/infrastructure/mailer/mailer-config.ts` registraba el transporte con
`registerMailerTransport({ ..., verifyOnStart: true })`. Según `@xtaskjs/mailer`
(`dist/cjs/lifecycle.js`, `MailerLifecycleManager.initialize()`):

```js
if (definition.verifyOnStart && typeof transporter.verify === "function") {
    await transporter.verify();
}
```

y, según el propio README del paquete: *"During `CreateApplication()`: registered transports
are created before container lifecycle listeners are resolved."* Es decir, `initialize()` (y
por tanto el `await transporter.verify()`) se ejecuta **de forma síncrona dentro de
`CreateApplication()`**, antes de que `app.ts` llegue a `fastify.listen(...)`. `transporter.verify()`
es una llamada real de Nodemailer contra el host/puerto SMTP configurado; si nada responde
(puerto filtrado, red caída, servicio no arrancado) esa promesa puede tardar minutos o no
resolver nunca, bloqueando todo el arranque de la API sin ningún log de error.

### Verificación empírica realizada
1. Se reprodujo el stack completo en Docker (Postgres/Redis reales) parando el contenedor
   `mailhog` y forzando el recreate de `api` sin esperar la dependencia (`docker compose up -d
   --no-deps --force-recreate api`).
2. Con `verifyOnStart: true` (comportamiento original), el log se detenía en
   `Kernel started successfully` y `curl -m 5 http://localhost:3000/health` no obtenía
   respuesta dentro del timeout.
3. Tras el fix (ver abajo), el mismo escenario muestra `Server listening` de inmediato,
   `curl` responde `200`, y varios segundos después aparece en el log:
   `[Mailer] SMTP transport verification failed; email sending may not work Error: timed out after 5000ms`
   — sin haber bloqueado nada.

## Fix aplicado

1. **`mailer-config.ts`**: `verifyOnStart` pasa a `false`. La creación del transporte ya no
   depende de que el SMTP esté disponible en el instante del arranque.
2. **Nuevo módulo `mailer-startup-check.ts`**: expone `verifyMailerTransportInBackground()`,
   que llama a `getMailerLifecycleManager().verify()` envuelto en un timeout explícito
   (5s) mediante `Promise.race`, y registra el resultado (`console.info`/`console.warn`)
   sin propagar la excepción ni bloquear a quien la invoca.
3. **`app.ts`**: `startApplication()` invoca `verifyMailerTransportInBackground()` **después**
   de `await current.listen(...)`, en modo fire-and-forget (no se espera su resultado). Así,
   un SMTP caído o lento solo genera un warning en el log; nunca impide que la API escuche
   peticiones.

## Recomendación de fondo

Cualquier verificación de un servicio externo opcional/auxiliar (SMTP, colas, servicios de
terceros) que se registre como `verifyOnStart` o equivalente en el arranque de xTaskJS debe
tratarse igual: la disponibilidad de un componente **no crítico para servir peticiones HTTP**
nunca debe poder bloquear indefinidamente `CreateApplication()`/`listen()`. Preferir siempre
verificación asíncrona en background con timeout explícito y logging, dejando que el arranque
falle rápido y con mensaje solo cuando el servicio afectado es realmente imprescindible
(como sí lo es Postgres, verificado por el smoke check de `assertRequiredComponents` en
`app.ts`, ver `09-hallazgos-tecnicos/bug-arranque-userrepository.md`).
