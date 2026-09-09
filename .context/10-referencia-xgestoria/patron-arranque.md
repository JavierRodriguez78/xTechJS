# Patrón de arranque de referencia: `xGestoria/backend`

Proyecto hermano (mismo autor, mismo stack xtaskjs + PostgreSQL + Redis + CQRS + Arquitectura Hexagonal) ya en un estado más maduro. Útil como referencia de estructura a medida que `xTechJS` crezca, no como copia literal (los dominios son distintos).

Repositorio: `https://github.com/JavierRodriguez78/xGestoria` (carpeta `backend/`)

## Estructura de arranque

- `main.ts` (raíz del proyecto): solo hace `import "reflect-metadata"` y llama a `startApplication()`. Nada de lógica aquí.
- `src/app.ts`: contiene `createApplication()` y `startApplication()`. Aquí se:
  1. Crea la instancia de Express/Fastify y se registran middlewares (json, CORS, validación, correlación).
  2. Se importan (por efecto lateral) todos los ficheros de configuración de integraciones (`data-source`, `cache.config`, `security.config`, `cqrs.config`, `event-source.config`, `mailer.config`) **antes** de llamar a `CreateApplication`.
  3. Se llama a `CreateApplication({ container, adapter, autoListen: false, ... })`.
  4. Se obtiene el contenedor (`application.getKernel().getContainer()`).
  5. Se inicializan explícitamente las integraciones sobre ese contenedor (`initializeTypeOrmIntegration`, `initializeEventSourceIntegration`, `initializeCqrsIntegration`, `initializeSecurityIntegration`, `initializeMailerIntegration`).
  6. Solo entonces se registra el middleware de errores y se hace `application.listen(...)`.
- `src/bootstrap.ts`: hook explícito (`wireBootstrap()`) reservado para preparar dependencias antes del escaneo del contenedor, aunque en el estado actual del repo está prácticamente vacío porque las integraciones ya se resuelven en `data-source.ts`/`cqrs.config.ts` al importarse.
- `src/app.config.ts`: **un único objeto de configuración centralizado** (`appConfig`) leído de variables de entorno, con valores por defecto, en vez de esparcir `process.env.X` por todo el código. Incluye explícitamente la estrategia de resolución del contenedor DI (`XTASK_DI_STRATEGY`, por defecto `"lazy"`) y si el manifiesto prebuilt está activo (`NODE_ENV === "production"`).
- Organización por **módulos de dominio** (`src/modules/<dominio>/{application,domain,infrastructure}`), igual que ya se está haciendo en `xTechJS` (`customers`, `repairs`, `users`).
- **Todo componente destinado a vivir en el contenedor de xtaskjs se declara con `@Service(...)`**, incluidos los repositorios (ver hallazgo en `09-hallazgos-tecnicos/bug-arranque-userrepository.md`) — nunca con el decorador `@Repository` de `@xtaskjs/core` a secas.
- Los repositorios inyectan el `DataSource` por **propiedad** (`@InjectDataSource() private readonly dataSource!: DataSource`) en vez de por constructor, lo que simplifica la firma del constructor cuando el repositorio también necesita otras dependencias inyectadas (ej. `EventStore`).
- Tiene un método `stopApplication()` simétrico a `startApplication()` que cierra ordenadamente todas las integraciones (`shutdownMailerIntegration`, `shutdownCqrsIntegration`, etc.) — útil para tests de integración y para un apagado limpio en producción (`SIGTERM`).

## Qué recomendamos adoptar en xTechJS a medida que crece

1. **Ya aplicado / a mantener:** organización por bounded context (`customers`, `repairs`, `users`, y los que vengan: `almacen`, `tpv`, `chat`).
2. **A adoptar:** centralizar toda la configuración de entorno en un único objeto (`app-config.ts` ya existe en xTechJS con Zod, que es incluso más estricto que el de xGestoria — mantenerlo).
3. **A adoptar:** separar `main.ts` (arranque puro) de un `app.ts` que exponga `createApplication()`/`startApplication()`/`stopApplication()` — esto facilita mucho los tests de integración (arrancar la app completa en memoria sin pasar por Docker) y evitará que `main.ts` seguir creciendo con imports y wiring manual como está pasando ahora.
4. **A adoptar:** usar siempre `@Service(...)` para cualquier clase que dependa del contenedor DI de xtaskjs (repositorios incluidos), evitando el decorador `@Repository` suelto.
5. **A valorar más adelante (no urgente):** si `xTechJS` incorpora Event Sourcing para el histórico de reparaciones (ya contemplado como extensión futura en el contexto original), el patrón de `EventStore` + agregados con `reconstitute()` de xGestoria es un buen punto de partida.

## Petición para ChatGPT

Usar esta comparación como guía de estilo/arquitectura para las próximas fases de `xTechJS` (especialmente al introducir `almacen`, `tpv` y `chat`), sin necesidad de replicar Event Sourcing todavía — solo el patrón de arranque (`app.ts` separado de `main.ts`) y la convención de `@Service(...)` para todo lo inyectable.
