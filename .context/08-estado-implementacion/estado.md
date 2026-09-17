# Estado de implementacion - xTechJS

**Actualizado:** 2026-09-17

Este documento complementa la especificacion funcional. Describe exclusivamente lo que
existe en el repositorio a esta fecha y debe actualizarse al finalizar cada fase.

## Base creada

- Monorepo `pnpm` con `apps/api` y `apps/web`.
- API inicial TypeScript con Fastify y endpoint `GET /health`.
- Configuracion de API validada al arranque con Zod y `ConfigService` de
  `@xtaskjs/config` para los puertos y conexiones de PostgreSQL/Redis.
- La API arranca mediante `CreateApplication` de xTaskJS con el adaptador Fastify.
  El ciclo de vida de `@xtaskjs/typeorm` administra el datasource `default`, ejecuta
  las migraciones al iniciar el servidor y cierra la conexion al detenerse. El script
  de migraciones conserva su `DataSource` explicito para ejecutarse fuera de la API.
- El arranque queda separado: `main.ts` carga metadatos y llama a `startApplication`,
  mientras `app.ts` expone `createApplication`, `startApplication` y
  `stopApplication`. Los repositorios PostgreSQL se registran con `@Service({ name })`
  e inyectan el datasource mediante `@InjectDataSource`; no se usan decoradores
  `@Repository` para componentes DI.
- `app.ts` incluye un smoke check que resuelve los repositorios nombrados requeridos
  antes de escuchar peticiones, y sus pruebas cubren el fallo explícito si falta uno.
- Tipos de dominio iniciales: roles `admin`, `technician`, `customer` y estados de
  reparacion configurables por codigo.
- Modulo inicial de usuarios con entidad, puerto de repositorio, caso de uso de
  consulta, adaptador PostgreSQL y endpoint `GET /api/users`.
- Piloto de DI y CQRS aplicado a usuarios: `PostgresUserRepository` y los servicios
  de usuarios estan registrados como componentes xTaskJS; `BootstrapAdmin` y
  `AuthenticateUser` se despachan por `CommandBus`, mientras listado de usuarios y
  tecnicos se resuelve por `QueryBus`. `AuthController` y `UserController` exponen
  con decoradores xTaskJS las rutas de autenticacion, usuarios y tecnicos; Fastify
  queda como adaptador HTTP y se conservan contratos, JWT y permisos existentes.
- Conexion PostgreSQL mediante TypeORM: `DataSource`, entidad `users`, repositorio
  TypeORM y migracion inicial. El contenedor de API ejecuta las migraciones antes de
  arrancar; en local se puede usar `pnpm --filter @xtechjs/api migration:run` tras
  compilar la API.
- Migracion incremental de credenciales para bases creadas antes de `password_hash`;
  evita que los volumenes PostgreSQL existentes requieran borrarse al desplegar auth.
- Matriz RBAC de permisos extensible y pruebas unitarias de roles.
- Autenticacion inicial: bootstrap de administrador, contraseñas con hash bcrypt,
  login JWT, guards HTTP por permiso y suplantacion de tecnico/cliente con auditoria
  en `audit_logs`. La estrategia JWT de `@xtaskjs/security` se registra durante el
  arranque y los controladores privados usan `@Authenticated()`; `@fastify/jwt` se
  conserva para emitir tokens y compatibilidad de request. La autorizacion granular
  se declara mediante `@PermissionRequired`, que consume el contexto autenticado de
  xTaskJS y devuelve `403` sin repetir la verificacion del JWT.
- Portal de cliente separado en `/customer`: login mediante
  `POST /api/auth/customer/login`, listado de reparaciones propias mediante
  `GET /api/customer/repairs`, consulta de presupuesto propio y aprobacion mediante
  `POST /api/customer/repairs/:id/quote/approve`. La API valida la propiedad usando
  el email del usuario autenticado contra el CRM antes de devolver o aprobar un
  presupuesto; el portal interno de trabajadores no se mezcla con esta vista.
- Portal interno Vue protegido por login: usa `POST /api/auth/staff/login`, persiste
  el JWT y el perfil en `localStorage`, rechaza el rol `customer` y permite cerrar
  sesion. El portal de cliente funciona de forma independiente en `/customer`.
- Primer vertical CRM de clientes: entidad TypeORM, migracion, puerto y repositorio
  PostgreSQL, casos de uso para alta, listado, ficha y edicion. Migrado a DI/CQRS
  xTaskJS: casos de uso como servicios decorados, comandos/queries con handlers y
  `CustomerController` con guards por permiso. El contrato de edicion pasa de
  `PUT /api/customers/:id` a `PATCH /api/customers/:id` porque el adaptador
  Fastify de xTaskJS no enruta `PUT`; la semantica (actualizacion parcial) es la
  misma y el frontend ya lo usa. Las rutas manuales de Fastify del CRM fueron
  eliminadas. La vista CRM carga automaticamente el listado de clientes al
  montarse y conserva el boton de actualizacion manual. La ficha de cliente carga
  y muestra su historial de reparaciones mediante `GET /api/customers/:id/repairs`
  y la query CQRS `ListCustomerRepairs`.
- Modulo inicial de reparaciones: ordenes vinculadas a cliente con equipo, averia y
  accesorios; persistencia TypeORM y migracion para `repair_orders` y su linea de
  tiempo `repair_status_events`. Expone `GET`/`POST /api/repairs`, cambio de estado
  por `PATCH /api/repairs/:id/status` e historial por `GET /api/repairs/:id/history`.
  La consola interna permite crear, listar y actualizar ordenes de taller.
- Reparaciones incorpora asignacion a tecnicos activos y diagnostico tecnico, con
  migracion incremental y ruta `PATCH /api/repairs/:id/technical`. La consola carga
  tecnicos autorizados desde `GET /api/technicians` y permite guardar ambos datos.
- Reparaciones migrado a DI/CQRS xTaskJS: los 8 casos de uso son servicios
  decorados, expuestos mediante comandos/queries y `RepairController` con guards
  por permiso. El guardado de presupuesto pasa de `PUT` a
  `PATCH /api/repairs/:id/quote` (el adaptador Fastify de xTaskJS no enruta `PUT`)
  y el frontend ya lo usa. Las rutas manuales de Fastify de reparaciones fueron
  eliminadas; `main.ts` solo registra instancias nombradas de repositorios y
  delega todo el transporte en controladores xTaskJS.
- Dependencias xTaskJS declaradas para `core`, `common`, `config`, `cqrs`,
  `fastify-http`, `security`, `validation` y `value-objects`. `config` ya se usa
  desde la API; las demas se integraran al implementar sus capacidades.
- Cliente Vue 3 + TypeScript con una vista estatica de panel de taller. Los datos de
  resumen y ordenes son de ejemplo; el portal interno ahora incluye vistas graficas
  para CRM, reparaciones, almacén y TPV, conectadas a sus endpoints con JWT. Almacén
  permite gestionar materiales, ajustes, consumos, alertas, proveedores y recepción
  de órdenes de compra; TPV permite registrar y reembolsar cobros.
- Docker Compose declara cuatro servicios independientes: `web`, `api`, `postgres`
  y `redis`, con healthchecks y volumenes persistentes para datos.
- Imagen de API Node y una imagen de frontend Nginx con proxy interno de `/api` a
  `api:3000`, preservando el prefijo `/api` necesario para las rutas Fastify.
- La imagen de API genera un manifiesto xTaskJS precompilado desde `dist` al preparar
  el runtime, omite fuentes TypeScript y ejecuta como usuario `node` con permiso para
  su cache de manifiesto. Esto permite descubrir componentes DI/CQRS sin que Node
  intente ejecutar `.ts` en produccion.
- `reflect-metadata` es una dependencia directa de produccion de la API porque
  `main.ts` la carga antes del kernel; asi `pnpm deploy --prod` la conserva en la
  imagen final.
- Trazabilidad de peticiones: el frontend genera un UUID por cada `fetch` y lo
  propaga en `x-correlation-id`; la API acepta o genera ese identificador, lo
  devuelve en la respuesta y lo incluye en los logs de inicio, error y fin de la
  peticion. `CommandBus`, `QueryBus`, todos los casos de uso y repositorios
  PostgreSQL estan instrumentados con `@Traceable`, que registra inicio, fin,
  error y duracion de cada operacion con el mismo identificador.
- El frontend publica eventos minimos de inicio, fin y error en
  `POST /api/observability/frontend-trace` mediante `sendBeacon`; no transmite
  payloads, queries, credenciales ni JWT. `make trace CORRELATION_ID=<uuid>`
  muestra por separado los logs de API y los eventos del frontend.
- `Makefile` raiz para instalar dependencias, desarrollo local, Docker, shells de
  contenedores, migraciones, pruebas, typecheck y compilacion.

## Verificacion realizada

- `pnpm install --ignore-scripts` completado correctamente.
- `pnpm typecheck` completado correctamente para API y frontend.
- `pnpm --filter @xtechjs/api test`: 12 pruebas de RBAC, autenticacion, CRM y
  reparaciones superadas, 0 fallos, incluido el calculo del total de presupuesto y
  tras incorporar el piloto de DI/CQRS de usuarios.
- Tras separar el arranque y adoptar repositorios `@Service`, `pnpm --filter
  @xtechjs/api test` supera 14 pruebas, incluido el smoke check de componentes.
- Validacion mas reciente: 14 pruebas API superadas, build API y build web
  completados correctamente tras incorporar caja diaria, reportes TPV y recibo
  simplificado enriquecido.
- `pnpm --filter @xtechjs/api build` y `pnpm --filter @xtechjs/web build` completados
  correctamente tras incorporar presupuestos de reparacion.
- `pnpm --filter @xtechjs/web build` completado correctamente tras incorporar la
  carga automatica de clientes al entrar en CRM.
- `GET http://127.0.0.1:3000/health` respondio correctamente durante desarrollo local.
- `make rebuild` construyo y arranco correctamente los servicios `postgres`, `redis`,
  `api` y `web`; `GET http://127.0.0.1:3000/health` respondio desde la pila Docker.
- Trazabilidad verificada en Docker: una peticion a `/health` con
  `x-correlation-id: trace-check-20260909` devuelve esa misma cabecera y deja los
  logs correlacionados de inicio y fin en la API.
- Trazabilidad por capas verificada en Docker: `GET /api/customers` deja, bajo el
  mismo `correlationId`, los logs de `QueryBus`, `ListCustomers` y
  `PostgresCustomerRepository`, con sus duraciones.
- Almacen verificado en Docker: alta de material `201`, entrada de stock `200` y
  consulta de movimientos `200`, con trazabilidad de la operacion.
- Consumo de almacén verificado en Docker: entrada de `5`, consumo enlazado de `2`
  con `repairOrderId`, stock final `3` y movimientos consultables `200`.
- Alertas de stock verificadas en Docker: material creado con stock `0` y minimo `5`
  aparece en `GET /api/inventory/alerts/low-stock` con `200`.
- Proveedores verificados en Docker: alta `201` y listado `200` mediante el catalogo
  protegido de inventario.
- Ordenes de compra verificadas en Docker: proveedor, material y orden creados; la
  recepcion devuelve `200`, cambia el estado a `received`, incrementa el stock y
  registra el movimiento de entrada asociado.
- TPV verificado en Docker: primer vertical de cobros asociado a reparaciones,
  usando importes enteros en centimos y metodos `cash`, `card` o `transfer`. Expone
  `GET`/`POST /api/payments` y `GET /api/payments/repair/:repairOrderId`, protegidos
  por `payments:manage`; un cobro de tarjeta devuelve `201` y su consulta `200`.
- Reembolsos TPV verificados en Docker: `POST /api/payments/:id/refund` devuelve
  `200` y cambia el pago a `refunded`; un segundo reembolso devuelve `409`.
- Ticket simplificado TPV verificado en Docker: `GET /api/payments/:id/receipt`
  devuelve `200` con numero de recibo, pago, cliente, reparación e instante de
  emision; queda preparado como base para generar PDF.
- PDF TPV implementado mediante `GET /api/payments/:id/pdf`, con descarga
  `application/pdf`, datos de cliente/reparación, importe y método de pago; validado
  en Docker con respuesta `200` y firma `%PDF`.
- Resumen diario TPV implementado mediante `GET /api/payments/summary/:date`,
  agrupando cobros, reembolsos y neto por método de pago; la consola muestra las
  métricas del día.
- Caja diaria TPV implementada con apertura, consulta y cierre persistente mediante
  `POST /api/payments/cash-register/:date/open`,
  `GET /api/payments/cash-register/:date` y
  `POST /api/payments/cash-register/:date/close`. El cierre congela cobros,
  reembolsos y neto del día.
- Reporte TPV por rango implementado mediante
  `GET /api/payments/report/:from/:to`, con totales globales, desglose diario y
  desglose por método de pago, técnico y tipo de dispositivo.
- Cierre diario TPV validado en Docker: apertura `201`, cierre `200` y resumen
  congelado con cobros, reembolsos y neto.
- Seguridad declarativa verificada en Docker: las rutas privadas con
  `@Authenticated()` devuelven `401` sin token y `GET /api/customers` devuelve
  `200` con un JWT administrativo valido emitido con la configuracion de la API.
- RBAC declarativo verificado en Docker: un tecnico sin `customers:manage` recibe
  `403 Forbidden` al crear clientes, mientras un administrador autorizado recibe
  `201`.
- Portal cliente compilado correctamente: API con login, consultas y aprobacion
  protegida por propiedad; frontend con entrada separada `/customer` y boton de
  aprobacion para presupuestos enviados.
- Consola interna validada mediante build web después de añadir las vistas de almacén
  y TPV; se mantiene la entrada separada del portal de cliente.
- Vista TPV actualizada con estado de caja diaria, controles de apertura/cierre y
  neto de caja; el ticket PDF sigue disponible mediante endpoint protegido.
- Historial CRM verificado en Docker: `GET /api/customers/:id/repairs` devuelve
  `200` y una coleccion vacia para un cliente sin ordenes.
- `make trace CORRELATION_ID=b7a2d7c1-245e-4efc-b0b8-01a636c7d4fb` validado en
  Docker: el evento frontend se registra de forma separada y el receptor responde
  `204`.
- El Dockerfile de API utiliza `pnpm deploy --legacy --prod /opt/api`, correccion
  necesaria para pnpm 10+ sin `inject-workspace-packages`. Falta confirmar el build
  de esa capa con Docker disponible.
- Se ha integrado `@xtaskjs/mailer` con `registerMailerTransport()` y configuracion
  de `SMTP_*`/`MAIL_FROM`, siguiendo el contrato oficial del paquete. El servicio
  `mailhog` ya queda declarado en `compose.yaml` y la API la usa como transporte de
  pruebas SMTP local, sin enviar correos reales.
- **(2026-09-16) Corregido: riesgo de arranque colgado si el SMTP no está
  disponible.** `mailer-config.ts` usaba `verifyOnStart: true`, que ejecuta
  `transporter.verify()` de forma síncrona dentro de `CreateApplication()`, antes de
  `fastify.listen(...)`. Si nada responde en el puerto SMTP (MailHog no levantado en
  local, o un fallo temporal del SMTP real en producción), la API se queda colgada
  sin loguear error y sin servir ninguna petición. Se cambia a `verifyOnStart: false`
  y se añade `mailer-startup-check.ts` (`verifyMailerTransportInBackground()`), que
  verifica el transporte en segundo plano tras `listen()`, con timeout explícito
  (5s) y logging (`console.info`/`console.warn`), sin bloquear ni propagar el
  fallo. Reproducido y verificado en Docker parando `mailhog`: `Server listening`
  y `/health` (`200`) llegan de inmediato; la verificación falla en background con
  warning tras el timeout. `pnpm --filter @xtechjs/api typecheck` y
  `pnpm --filter @xtechjs/api test` (18/18) siguen en verde. Detalle completo en
  `.context/09-hallazgos-tecnicos/bug-arranque-mailer-verify.md`.
- **(2026-09-16) Chat en tiempo real cliente-técnico implementado.** Nuevo bounded
  context `chat`: entidad `ChatMessageEntitySchema` (tabla `chat_messages`, FK a
  `repair_orders`), migración `1738200000000-initial-chat-messages.ts`,
  repositorio `PostgresChatMessageRepository` (`chatMessageRepository`, incluido
  en el smoke check de `app.ts`). Casos de uso `SendChatMessage`/`ListChatMessages`
  y variantes de cliente con verificación de propiedad de la reparación
  (`SendOwnCustomerChatMessage`/`ListOwnCustomerChatMessages`), expuestos vía CQRS
  y HTTP: `GET`/`POST /api/repairs/:id/messages` (staff, permiso `chat:use`) y
  `GET`/`POST /api/customer/repairs/:id/messages` (cliente). Tiempo real con
  `@xtaskjs/socket-io` (namespace `/chat`): el gateway verifica el JWT en el
  handshake (mismo secreto que `@fastify/jwt`, vía `fast-jwt`), rechaza
  conexiones sin `chat:use`, y solo permite unirse a la sala de una reparación
  (`chat.join`) si el usuario tiene acceso; `SendChatMessage` emite `chat.message`
  a la sala tras persistir. Se detectó y corrigió durante la implementación un
  bug de arranque (inyección por constructor de repositorios TypeORM dentro de un
  `@SocketGateway()` compite con el registro del datasource) — documentado en
  `.context/09-hallazgos-tecnicos/bug-arranque-socketgateway-constructor-injection.md`.
  Verificado: `pnpm --filter @xtechjs/api typecheck`, 21/21 pruebas (18 previas +
  3 nuevas de `chat`), y arranque/migración/tabla comprobados en Docker.
- **(2026-09-16) Frontend de chat y notificaciones de nuevos mensajes.** Componente
  `ChatPanel.vue` (`features/chat/`, usa `socket.io-client`) integrado como pestaña
  "Mensajes" en el detalle de reparación del portal interno (`repairs.detail.chat`)
  y como sección del portal de cliente. Proxy de WebSocket `/socket.io/` añadido a
  Vite (dev) y `nginx.conf` (prod). Se añaden notificaciones de mensajes nuevos
  fuera de la pestaña de chat: el gateway une cada socket a una sala de
  notificación por rol (`chat:staff` para admin/técnico, `chat:customer:<id>` para
  cada cliente) y `SendChatMessage` emite un evento ligero `chat.notification`
  (remitente, aviso, fecha) a esas salas además del mensaje completo a la sala de
  la reparación. En el frontend, `features/chat/notifications.ts` mantiene un
  contador de no leídos por reparación y una cola de toasts (auto-descartables,
  navegables al hacer clic), mostrados en `AppLayout.vue` (badge junto a
  "Reparaciones" y por fila en `RepairListView.vue`) y en `CustomerPortal.vue`
  (badge por reparación). `ChatPanel.vue` marca como leído al abrir la pestaña y
  al recibir un mensaje de la reparación abierta.
  **Se corrigió además un segundo bug de arranque, más profundo que el anterior**:
  cualquier dependencia respaldada por el datasource en un `@SocketGateway` revienta
  igual sea inyectada por constructor o por propiedad (ambas rutas son eager en
  `@xtaskjs/core`); y se descubrió que `@Qualifier` es un no-op silencioso cuando se
  usa como decorador de propiedad (solo funciona en parámetros de constructor),
  lo que había enmascarado el problema en el primer intento de fix. El fix final
  resuelve los repositorios bajo demanda desde `context.container` dentro de cada
  manejador de evento, sin ninguna dependencia gestionada por xtaskjs en la propia
  clase. También se corrigió una condición de carrera cliente-servidor en la unión
  a salas (`chat.join` con ack, reintento acotado y re-unión automática tras
  reconexión). Documentado íntegramente (las tres iteraciones fallidas y la
  correcta) en
  `.context/09-hallazgos-tecnicos/bug-arranque-socketgateway-constructor-injection.md`.
  Verificado con una conexión Socket.IO real (JWT firmado manualmente para un
  cliente existente) contra la API en Docker: sin caída del proceso y ack
  coherente en `chat.join`. `pnpm --filter @xtechjs/api typecheck`/`test` (21/21)
  y `pnpm --filter @xtechjs/web build` en verde.
- **(2026-09-16) Adjuntos de reparación (fotos/vídeos) implementados.** Nuevo
  bounded context `attachments`: entidad `RepairAttachmentEntitySchema` (tabla
  `repair_attachments`, FK a `repair_orders`), migración
  `1738300000000-initial-repair-attachments.ts`, repositorio
  `PostgresRepairAttachmentRepository` (`repairAttachmentRepository`) y
  almacenamiento en disco `LocalDiskAttachmentStorage` (`attachmentStorage`,
  directorio configurable por `UPLOADS_DIR`, con guarda contra path traversal),
  ambos incluidos en el smoke check de `app.ts`. Subida con `@fastify/multipart`
  (límite configurable por `ATTACHMENT_MAX_SIZE_BYTES`, 25 MB por defecto),
  validación de tipo MIME contra una lista blanca de imágenes/vídeos. Endpoints:
  `GET`/`POST`/`DELETE /api/repairs/:id/attachments[/:attachmentId]` (staff; solo
  `repairs:manage` puede subir/eliminar, `repairs:read` puede listar/descargar) y
  `GET /api/customer/repairs/:id/attachments[/:attachmentId]` (cliente, con
  verificación de propiedad de la reparación, solo lectura). Las descargas se
  devuelven como `Buffer` completo (no como stream) porque el adaptador HTTP de
  xTaskJS no soporta `reply.send()` de streams sin buffering — devolvía `204 No
  Content` con un stream, y `200` con el `Buffer`. Frontend:
  `features/attachments/` (`api.ts` con descarga autenticada vía `Blob`,
  `AttachmentsPanel.vue` reutilizable) integrado como pestaña "Adjuntos"
  (`repairs.detail.attachments`) en el portal interno (con subida/borrado para
  admin/técnico) y como sección de solo lectura en `CustomerPortal.vue`. Volumen
  Docker `api-uploads` persistente montado en `/app/uploads`. Verificado de
  extremo a extremo en Docker con peticiones reales: subida (`201`), listado,
  descarga (`200` con el contenido correcto), rechazo de tipo no permitido
  (`400`), borrado (`204`), y comprobación de propiedad cruzada entre clientes
  (`404` para quien no es dueño de la reparación). `pnpm --filter @xtechjs/api
  typecheck`/`test` (24/24) y `pnpm --filter @xtechjs/web build` en verde.
- Nuevo flujo de alta de cliente: `email` obligatorio, `registrationStatus` con
  valor inicial `pending`, validacion de token de invitacion y endpoints publicos de
  registro para `/api/customers/register/:token` con confirmacion de contraseña,
  facturacion y consentimiento. El registro no completo queda bloqueado hasta que
  el cliente termina el proceso.
- Integrado el repositorio de tokens de registro de clientes y la migracion de tabla
  `customer_registration_tokens` para persistir tokens con hash y caducidad.
- Implementado el caso de uso `SendCustomerRegistrationEmail` que genera un token de
  un solo uso y envía la invitacion por SMTP usando `@xtaskjs/mailer` y la URL
  publica configurable `WEB_PUBLIC_URL` (fallback `http://localhost:8080`).
- La API verifica que el token existente siga vigente (`usedAt IS NULL` + expiracion)
  antes de completar el alta del cliente; la confirmacion guarda la contraseña hash,
  los datos fiscales y marca el cliente como `completed`.
- Vista publica de autorregistro implementada en
  `/customer/register?token=<token>`: valida el enlace, solicita contraseña con
  confirmacion, datos de facturacion y consentimiento expreso; informa de tokens
  ausentes, invalidos, caducados o ya utilizados.
- **(2026-09-16) Corregido: el consentimiento RGPD/LOPD se validaba pero no se
  persistia.** `completeCustomerRegistration` exigia `consentAccepted`/`consentText`
  por Zod pero nunca los guardaba, sin tabla ni columnas de auditoria. Se ha creado
  la entidad `DataProtectionConsentEntitySchema` y la tabla `data_protection_consents`
  (migracion `1738100000000-add-data-protection-consents.ts`, registrada en
  `data-source.ts`): un registro **inmutable** por aceptacion (solo `INSERT`, nunca
  `UPDATE`/`DELETE`) con `consent_text`, `consent_version` (hash SHA-256 del texto,
  como version verificable), `accepted_at` e `ip_address` (de `request.ip`).
  `completeCustomerRegistration` inserta este registro antes de invalidar el token.
  Verificado con `pnpm --filter @xtechjs/api typecheck`, `pnpm --filter @xtechjs/api
  test` (18/18 pruebas OK) y comprobacion directa de la tabla en PostgreSQL tras
  reconstruir el contenedor `api` en Docker (`\d data_protection_consents`).
  Documentado tambien en `.context/11-alta-clientes/registro-cliente.md`.
- El CRM muestra el estado de registro y permite reenviar la invitacion de clientes
  `pending` mediante `POST /api/customers/:id/resend-invitation`.
- Corregida la autorizacion del CRM: `@Authenticated()` se ejecuta antes de
  `@PermissionRequired`, de forma que el guard recibe los claims del JWT. Un
  administrador puede crear clientes y un tecnico sin `customers:manage` recibe
  `403`.
- Añadida la migracion incremental `AddCustomerRegistrationDetailsMigration` para
  bases existentes: crea `registration_status` y los campos de facturacion sin
  eliminar el volumen de PostgreSQL.
- Flujo CRM de autorizacion y alta reverificado en Docker: `GET /api/customers`
  responde `200` y `POST /api/customers` responde `201` usando un JWT valido de
  administrador; la migracion de registro se ejecuta al iniciar la API.
- `pnpm --filter @xtechjs/api typecheck` y `pnpm --filter @xtechjs/web build`
  completados correctamente tras incorporar el frontend de autorregistro.
- Primera iteracion de migracion frontend completada: Vue Router 4 y Pinia quedan
  registrados en la aplicacion; el portal interno usa `AppLayout` y el portal de
  cliente usa rutas y layout propios. Las rutas privadas aplican guards globales
  por sesion y permiso.
- El CRM de clientes abandona el patron mixto de listado y formulario lateral:
  dispone de rutas para listado (`/clientes`), alta (`/clientes/nuevo`), detalle
  (`/clientes/:id/general`) con subrutas de general, facturacion, reparaciones y
  notas, y edicion (`/clientes/:id/editar`). La pestaña de reparaciones carga su
  informacion solo al abrirse.
- `pnpm --filter @xtechjs/web build` completado correctamente despues de añadir
  las rutas, layouts y vistas de clientes separadas.
- Segunda iteracion de migracion frontend completada para Reparaciones: listado,
  alta, detalle y las pestañas de datos generales, diagnostico, presupuesto e
  historial usan rutas propias bajo `/reparaciones`. Diagnostico, cambios de estado
  y presupuesto quedan aislados en sus pestañas y el historial se carga bajo demanda.
- `pnpm --filter @xtechjs/web build` completado correctamente despues de migrar
  la feature de Reparaciones a Vue Router.
- Tercera iteracion frontend completada para Almacen: catalogo, alta, ficha de
  material con pestañas de general y movimientos, alertas de stock, proveedores y
  ordenes de compra usan rutas independientes bajo `/almacen`.
- Cuarta iteracion frontend completada para TPV: listado de cobros, registro de
  cobro, detalle de recibo con descarga PDF, caja diaria e informes por rango usan
  rutas propias bajo `/tpv`.
- `pnpm --filter @xtechjs/web build` completado correctamente tras migrar Almacen
  y TPV a las nuevas vistas enrutadas.
 La ficha de Reparacion incorpora las pestañas enrutadas `materiales` y `cobros`.
 Materiales consulta movimientos vinculados a la orden y registra consumos contra
 el endpoint de inventario; Cobros lista los pagos de la orden y enlaza a su recibo.
 `pnpm --filter @xtechjs/web build` completado correctamente después de completar
 las pestañas de materiales y cobros de Reparaciones.
 El PDF de TPV queda estructurado como factura: emisor configurable, serie y
- El PDF de TPV queda estructurado como factura: emisor configurable, serie y
  numero persistentes, fecha de expedicion, destinatario con datos fiscales,
  concepto de reparacion, base imponible, tipo y cuota de IVA, total y forma de
  pago. La numeracion usa una secuencia PostgreSQL y no depende del UUID.
- Añadida la migracion incremental `AddInvoiceNumberingMigration` para incorporar
  serie y numero de factura a pagos existentes sin borrar el volumen PostgreSQL.
- Añadidas variables `INVOICE_ISSUER_*`, `INVOICE_SERIES` e `INVOICE_VAT_RATE` a
  la configuracion y Compose. Los valores por defecto del emisor son marcadores
  pendientes y deben sustituirse por los datos fiscales reales.
- Verificado en Docker que la migracion crea `payments.invoice_series` y
  `payments.invoice_number`; API typecheck y frontend build completados.
- Las facturas admiten lineas estructuradas con codigo, concepto, unidades, precio
  unitario, descuento manual por linea y tipo de IVA. El total se calcula en backend
  y se valida contra el cobro; pagos antiguos conservan una linea de servicio
  compatible generada desde su importe existente.
- La plantilla PDF muestra la tabla de lineas con columnas de codigo, concepto,
  unidades, precio, descuento e importe, junto con base imponible, IVA y total.
- Nuevo requisito documentado para la siguiente iteracion de TPV: al enviar una
  factura desde el staff, adjuntar el PDF en un email al cliente mediante Mailer,
  registrar el resultado de la notificacion y mostrar la factura dentro de la
  reparacion en el portal cliente con descarga autenticada por JWT.
- Implementado el envio de factura desde `POST /api/payments/:id/send-invoice`:
  genera el mismo PDF fiscal, lo adjunta mediante `@xtaskjs/mailer` y registra
  los estados `sent` o `failed` en `invoice_emails` junto con destinatario, error
  y fecha.
- Implementado el acceso de cliente a facturas: `GET /api/customer/repairs/:id/invoices`
  lista solo documentos de reparaciones propiedad del cliente autenticado y
  `GET /api/customer/repairs/:repairId/invoices/:paymentId/pdf` descarga el PDF
  tras comprobar email, reparación y pago.
- El TPV permite enviar la factura desde el detalle del cobro y el portal cliente
  muestra las facturas asociadas a cada reparación con descarga autenticada por
  JWT y `Blob`, sin abrir URLs protegidas con `window.open`.
- Verificado: `pnpm --filter @xtechjs/api typecheck`, `pnpm --filter @xtechjs/web build`,
  API Docker saludable y tabla `invoice_emails` creada por migración.
- Primera iteracion de Administracion implementada: `/admin/usuarios` ofrece
  listado filtrable por texto, rol y estado; `/admin/usuarios/:id/general` muestra
  el detalle de la cuenta y `/admin/usuarios/:id/permisos` muestra sus permisos
  efectivos por rol. La accion de suplantacion usa el endpoint existente de auth y
  queda restringida al administrador.
- `pnpm --filter @xtechjs/web build` completado correctamente tras añadir las vistas
  de Administracion y sus rutas protegidas por `users:manage`.
- Gestión de usuarios ampliada: `POST /api/users` y `PATCH /api/users/:id`
  permiten alta y edición administrativa con roles, estado activo y cambio de
  contraseña hasheada. La UI añade `/admin/usuarios/nuevo` y
  `/admin/usuarios/:id/editar`, con formularios de una columna y navegación al
  detalle tras guardar.
- `pnpm --filter @xtechjs/api typecheck`, las 14 pruebas API y
  `pnpm --filter @xtechjs/web build` completados correctamente tras esta iteración.
- Configuración administrativa persistida: estados de reparación, tipos de
  dispositivo y plantillas de notificación se almacenan en `admin_config_values`
  mediante `AddAdminConfigMigration`; el servicio inicializa los valores por
  defecto bajo demanda y conserva cambios durante reinicios de la API.
- Los endpoints existentes de configuración administrativa ahora leen desde la
  persistencia, y la prueba de configuración cubre altas y bajas de valores.
- Validado en Docker: la migración se aplica y la API queda `healthy`; typecheck
  y las pruebas administrativas pasan correctamente.
- Configuración administrativa ampliada con edición persistente: los administradores
  pueden añadir y eliminar estados de reparación, tipos de dispositivo y plantillas
  de notificación mediante endpoints protegidos y controles en las tres vistas web.
- Validación más reciente: 18 pruebas API relacionadas con administración,
  autenticación, reparación y configuración superadas; `pnpm --filter
  @xtechjs/web build` completado correctamente.

## Cambios recientes (2026-09-13)

- Ajuste del dominio y contrato del cliente para incluir `registrationStatus` y
  campos de facturacion en `Customer` y `CreateCustomerInput`.
- El alta de cliente ya exige `email` y genera `registrationStatus: "pending"` al
  crear la entidad, con pruebas unitarias que cubren el requisito.
- La infraestructura SMTP de la API queda configurada para MailHog y preparada para
  envio de invitaciones transaccionales.
- Implementada la interfaz de autorregistro publico con validacion de token,
  confirmacion de contraseña, datos fiscales y consentimiento obligatorio.
- Implementado el reenvio de invitacion desde CRM para clientes pendientes.
- Resuelto el `403 Forbidden` al crear clientes y la falta de columnas de onboarding
  en bases de datos existentes mediante el orden correcto de guards y una migracion
  incremental.
- Iniciada la migracion de frontend indicada en
  `04-frontend/frontend.md`: la feature Clientes ya usa navegacion real, URLs de
  detalle y vistas independientes. Reparaciones, Almacen y TPV se mantienen como
  siguientes iteraciones de migracion antes de volver a exponerlas en la navegacion
  interna.
- Las cuatro features internas implementadas (Clientes, Reparaciones, Almacen y
  TPV) ya usan rutas independientes y no exponen las consolas mixtas heredadas en
  la navegacion. Chat y adjuntos por reparación ya tienen pestañas propias
  (`repairs.detail.chat`, `repairs.detail.attachments`).
- Adjuntos y chat por reparación ya están implementados (API, persistencia,
  Socket.IO y almacenamiento en disco); ver entradas del 2026-09-16 más arriba.

## Pendiente por area

## Requisito transversal obligatorio

- Todo endpoint, proceso asíncrono y servicio nuevo debe emitir logs estructurados
  con `correlationId`. Las llamadas originadas en frontend deben propagarlo en la
  cabecera `x-correlation-id`; los servicios internos deben conservarlo al invocar
  otros servicios, colas o tareas. Todo caso de uso y repositorio debe instrumentarse
  con `@Traceable` (o una alternativa equivalente que cubra inicio, fin, error y
  duracion). No registrar secretos, contraseñas, JWT ni datos sensibles completos en
  los logs.

### Backend y dominio

- Diseñar los bounded contexts y la estructura hexagonal definitiva para los
  modulos pendientes: almacen, TPV y chat.
- Modelar agregados, value objects, puertos y repositorios de esos modulos.
- Completar proyecciones CQRS de lectura si se separan modelos de lectura.
- Mantener `@PermissionRequired` como convencion para toda ruta privada nueva;
  `@Roles` se reserva para politicas que dependan exclusivamente del rol.
- Cache Redis, rate limiting, correo, scheduler, Socket.IO y adjuntos.
- Tests de dominio y aplicacion con `@xtaskjs/testing`.

### Funcionalidad

- CRM: alta, listado, ficha, edicion, etiquetado, historial de reparaciones e
  historial de comunicaciones ya implementados.
- Reparaciones: consumo de materiales. Ordenes, equipo basico, estados,
  timeline, diagnostico, asignacion, presupuesto interno, aprobacion desde portal
  de cliente, adjuntos (fotos/vídeos) y chat ya existen.
- Almacen: primer vertical implementado con catalogo de materiales, stock entero y
  movimientos auditados. Usa `@Service`, CQRS, `InventoryController` y migraciones
  `inventory_items`/`inventory_movements`. Expone `GET`/`POST /api/inventory`,
  `PATCH /api/inventory/:id/stock` y `GET /api/inventory/:id/movements`, protegidos
  por `inventory:manage`; impide stock negativo en transaccion. El consumo desde
  reparaciones se registra mediante `POST /api/inventory/:id/consume`, con
  `repairOrderId`, movimiento negativo auditado y migracion incremental. Las alertas
  de stock bajo minimo se consultan en `GET /api/inventory/alerts/low-stock`. El
  catalogo de proveedores usa `inventory_suppliers` y expone
  `GET`/`POST /api/inventory/suppliers`; las ordenes de compra exponen
  `GET`/`POST /api/inventory/purchase-orders` y
  `POST /api/inventory/purchase-orders/:id/receive`.
- TPV: cobros y reembolsos asociados a reparaciones implementados con TypeORM,
  CQRS, `PaymentController` y trazabilidad. Incluye resumen diario, cierre
  persistente de caja, reporte por rango y descarga PDF con estructura de factura.
  La validacion legal definitiva, series fiscales reales, numeracion por ejercicio,
  facturacion electronica y requisitos de IVA deben ser revisados
  y configurados con asesoramiento fiscal antes de emitir documentos oficiales.
- **(2026-09-17) Facturación automática de piezas implementada.** Cada consumo
  de almacén vinculado a una reparación se ejecuta en la misma transacción que
  la creación del movimiento y añade una línea idempotente a `invoice_drafts`,
  usando `sourceMovementId` como referencia única lógica. Las líneas congelan
  SKU/concepto, cantidad, `salePriceCents`, descuento e IVA del material en el
  momento del consumo. Se añadió la migración
  `1738400000000-add-invoice-drafts-and-material-prices.ts`, campos fiscales al
  catálogo (`sale_price_cents`, `tax_rate`), el endpoint protegido
  `GET /api/payments/draft/repair/:repairOrderId` y la creación de pagos reutiliza
  automáticamente el borrador cuando no se envían líneas manuales. La pestaña
  `materiales` muestra las líneas generadas como "Factura automática en borrador"
  y el alta de materiales permite configurar precio e IVA. Verificado: typecheck
  API, tests API, build frontend y migración
  Docker aplicada. Prueba end-to-end real: consumos de 2 y 1 unidades generaron
  dos líneas con `sourceMovementId` distintos, precio de 1250 céntimos e IVA del
  21%; después se limpiaron los datos temporales de la prueba.
- **(2026-09-17) Facturas rectificativas implementadas.** Una factura emitida
  permanece inmutable y su rectificación crea un documento independiente con
  serie `R`, líneas negativas, motivo obligatorio y vínculo a la factura original.
  La operación es transaccional y el índice único sobre `original_payment_id`
  impide emitir dos rectificativas para la misma factura. El PDF, TPV, ficha de
  reparación y portal de cliente distinguen ambos documentos y muestran los
  importes con su signo fiscal. La migración
  `1738500000000-add-invoice-rectifications.ts` está aplicada en PostgreSQL;
  verificados 26/26 tests API, build API, build frontend y contenedores saludables.
- Chat: canal de mensajería por reparación implementado (backend y frontend).
  API REST (`/api/repairs/:id/messages`, `/api/customer/repairs/:id/messages`)
  con persistencia en `chat_messages` y tiempo real vía `@xtaskjs/socket-io`
  (namespace `/chat`, autenticado con JWT). Frontend: componente reutilizable
  `ChatPanel.vue` (`features/chat/`) usando `socket.io-client`, integrado como
  pestaña "Mensajes" en el detalle de reparación del portal interno
  (`repairs.detail.chat`) y como sección en el portal de cliente
  (`CustomerPortal.vue`). El proxy de WebSocket (`/socket.io/`) se añadió tanto
  al servidor de desarrollo de Vite como al `nginx.conf` de producción.
  Verificado: `pnpm --filter @xtechjs/web build` y handshake de Socket.IO
  comprobado en Docker a través de Nginx.
- Administracion: usuarios, roles, configuracion, auditoria y dashboards.
- Administracion: usuarios, alta, edición, permisos efectivos, suplantación,
  auditoría consultable y configuración persistente y editable de estados,
  dispositivos y plantillas ya están disponibles, y se aplican de verdad sobre
  los flujos (ver entrada del 2026-09-17 sobre configuración dinámica).

### Frontend

- Router, arquitectura por features y cliente HTTP/WebSocket.
- Router y guards de navegacion por rol. El portal interno y el portal de cliente
  ya tienen entradas separadas, aunque la navegacion sigue siendo una bifurcacion
  simple por pathname y no un router Vue dedicado.
- Vistas funcionales para admin, tecnico y cliente.
- Formularios, validacion, estados de carga/error y conexion con API.
- Carga y reproduccion segura de fotos y videos ya implementada (pestaña
  "Adjuntos" en el portal interno, sección de solo lectura en el portal de
  cliente, descargas autenticadas vía `Blob`).

### Infraestructura
- Preparar manifiestos o valores de despliegue para una futura plataforma de
  orquestacion, sin acoplar el codigo a ella.
- **(2026-09-17) Vitest incorporado al frontend.** `apps/web` usa `vitest` con
  entorno `jsdom` y `@vue/test-utils`, configurado en `vitest.config.ts`; el
  fichero de preparación `src/test-setup.ts` limpia `localStorage` y dobla
  `fetch` para que una prueba que salga a la red falle de forma explícita.
  `make test-web` ejecuta typecheck y pruebas, `pnpm test` las lanza en todo el
  workspace y CI añade el paso "Web tests". 30 pruebas en 6 ficheros:
  propagación de `x-correlation-id` y ausencia de secretos en la traza del
  frontend, sesión del portal interno, contadores y toasts de notificaciones de
  chat, etiquetas de estado de reparación y dos suites de componente
  (`RepairTechnicalTab`, `RepairCreateView`) sobre los desplegables dinámicos.
  El `testTimeout` es de 30 s porque la primera prueba de cada fichero paga la
  transformación del módulo, lenta sobre WSL con el repositorio en disco Windows.
- **(2026-09-17) CI añadido en `.github/workflows/ci.yml`.** En cada push a
  `main`/`master` y en cada pull request ejecuta instalación reproducible con
  `pnpm-lock.yaml`, typecheck de API y frontend, los tests de API, los builds de
  producción, `docker compose config --quiet` y la construcción de las imágenes
  Docker de API y web. Validado localmente con los mismos comandos: typecheck
  completo OK, 24/24 tests API OK, build completo OK, Compose válido y ambas
  imágenes Docker construidas correctamente.
- **(2026-09-17) Secretos de producción endurecidos.** Nuevo
  `compose.production.yaml` como override separado: obliga a proporcionar las
  credenciales de PostgreSQL, `JWT_SECRET`, configuración SMTP y remitente; no
  cambia el flujo local de `make up`. La validación de configuración de la API
  rechaza además `change-me` y `development-only-secret-change-me-32` cuando
  `NODE_ENV=production`. Se añadieron `make prod-config` y `make prod-up`, se
  documentó la operativa en `README.md` y el contexto de infraestructura, y CI
  valida el override con valores efímeros de prueba sin registrar secretos.
- **Corrección de compatibilidad local (2026-09-17):** `compose.yaml` ya no fuerza
  `NODE_ENV=production` con credenciales de desarrollo; usa `development` por
  defecto y `compose.production.yaml` mantiene explícitamente `production`.
- **(2026-09-17) Pipeline de migraciones implementado.** La imagen API arranca
  únicamente el servidor y Compose reutiliza esa imagen en el servicio one-shot
  `migrate`. La API espera `service_completed_successfully`, con
  `RUN_MIGRATIONS_ON_STARTUP=false`, por lo que un fallo de esquema bloquea el
  despliegue y las réplicas no compiten por migrar. CI ejecuta dos veces las
  migraciones sobre PostgreSQL 17 vacío para comprobar aplicación e idempotencia.
  Validado en Docker: migrador con salida 0, segunda ejecución correcta y API
  saludable tras completar el paso.
- **(2026-09-17) Historial de comunicaciones CRM implementado.** La subruta
  `/clientes/:id/comunicaciones` carga bajo demanda invitaciones de registro y
  envíos de factura, ordenados de más reciente a más antiguo, con destinatario,
  estado, fecha, referencia fiscal y error de entrega cuando existe. El endpoint
  protegido `GET /api/customers/:id/communications` usa CQRS y el repositorio
  `customerCommunicationRepository`, sin exponer hashes ni tokens. Los intentos
  nuevos de invitación registran `pending`, `sent` o `failed` y conservan el error
  SMTP. Migración `1738600000000-add-invitation-delivery-status.ts` aplicada.
  Verificados 29/29 tests API, typecheck/build API, build frontend, Docker
  saludable y consulta autenticada con comunicaciones reales.
- **(2026-09-17) Configuración administrativa aplicada de forma dinámica.**
  Los estados de reparación, los tipos de dispositivo y las plantillas de
  notificación dejan de ser listas decorativas y gobiernan los flujos:
  - `repair-status.ts` conserva la matriz de transiciones del flujo base, pero
    `canTransitionRepairStatus(from, to, configured)` acepta la lista activa:
    entre dos estados base se aplica la matriz, y cuando alguno es un estado
    personalizado se permite la transición salvo desde un estado base terminal
    (`delivered`, `cancelled`), que debe seguir cerrando la orden. `RepairStatus`
    pasa a ser `string` y el `z.enum` del controlador se sustituye por validación
    contra la configuración: un estado no configurado devuelve `400`
    (`RepairStatusNotConfiguredError`) y un salto no permitido sigue devolviendo
    `409`.
  - `quoted` y `approved` quedan protegidos frente a su eliminación
    (`ProtectedConfigValueError`, `409`) porque `SaveRepairQuote` y
    `ApproveRepairQuote` los escriben por su cuenta.
  - `CreateRepairOrder` valida `deviceType` contra los tipos configurados y
    devuelve `400` si no lo está; una lista vacía se interpreta como "sin
    restricción" para no dejar el taller sin poder recepcionar equipos.
  - Nuevo puerto `repairWorkflowConfig` (adaptador `AdminRepairWorkflowConfig`)
    y `GET /api/repairs/config` con permiso `repairs:read`, para que un técnico
    sin `users:manage` pueda rellenar los formularios. El frontend alimenta
    desde ahí el filtro de estados del listado, el selector de estado de la
    pestaña de diagnóstico y el selector de tipo de equipo del alta; el tipo de
    equipo deja de ser texto libre.
  - Las plantillas de notificación pasan de una lista de nombres en
    `admin_config_values` a la tabla `notification_templates` con asunto, cuerpo,
    activación y marcadores (`{{customerName}}`, `{{deviceBrand}}`,
    `{{statusNote}}`, `{{portalUrl}}`…). Un marcador desconocido se elimina en
    lugar de llegar al cliente como `{{...}}`. `ChangeRepairStatus` avisa al
    cliente por el puerto `repairStatusNotifier`: si existe plantilla activa para
    `repair.status.<estado>` se renderiza y se envía por `@xtaskjs/mailer`, y el
    resultado (`pending`/`sent`/`failed` con su error SMTP) se guarda en
    `customer_notifications`. Un fallo de correo nunca revierte el cambio de
    estado: queda registrado y visible. El historial de comunicaciones del CRM
    añade ese tercer origen como tipo `repair_notification`.
  - `/admin/configuracion/plantillas` pasa de una lista de nombres a un editor
    de asunto, cuerpo y activación por estado, con los marcadores disponibles a
    la vista. Las etiquetas de estado se unifican en
    `features/repairs/status-labels.ts` y se comparten con el portal de cliente,
    donde además se corrigen tres claves obsoletas (`diagnosed`, `in_repair`,
    `unrecoverable`) que mostraban el código interno en lugar del estado.
  - Migración `1738700000000-add-notification-templates.ts` aplicada en Docker:
    crea ambas tablas, siembra las plantillas de `quoted`, `repaired` y
    `delivered`, y borra la clave `notificationTemplates` ya inaplicable.
  - Verificado: 53/53 tests API (antes 29), 30/30 tests web, typecheck de API y
    frontend, `pnpm build` completo, migración aplicada y API `healthy`.
    Prueba real end-to-end contra Docker: estado `esperando-pieza` añadido y
    asignado a una orden (`200`), estado inexistente rechazado (`400`), salto
    ilegal rechazado (`409`), estado `approved` protegido (`409`), tipo
    `Submarino` rechazado (`400`) y tipo `Dron` recién configurado aceptado
    (`201`); plantilla propia guardada, correo recibido en MailHog con los
    marcadores resueltos ("Esperamos una pieza para tu DJI Mini"), registro
    `sent` en `customer_notifications`, aparición en
    `GET /api/customers/:id/communications` y ausencia de aviso al desactivar la
    plantilla. Los datos temporales de la prueba se eliminaron después.

## Siguiente fase recomendada

1. Con Vitest y la aplicación dinámica de configuraciones cubiertas, la siguiente
  prioridad es completar la especificación de listados de
  `04-frontend/frontend.md` §3: paginación real en servidor
  (`{ items, total, page, pageSize }`), filtros por faceta y ordenación
  serializados en la query string, y los componentes compartidos
  (`DataTable`, `FilterBar`, `AppPagination`) que hoy no existen. Las vistas
  actuales filtran en cliente sobre la colección completa.
2. Ampliar la cobertura de Vitest a las vistas de listado y formulario a medida
  que se migren, empezando por Clientes.

Los cuatro modulos implementados (usuarios, CRM, reparaciones y almacen) usan el patron
xTaskJS completo: servicios `@Service` con `@Qualifier`, comandos/queries con
handlers `@CommandHandler`/`@QueryHandler`, controladores `@Controller` con guards
y repositorios registrados como instancias nombradas en `main.ts`. No quedan rutas
Fastify manuales. Patron a replicar en modulos futuros: almacen, TPV, chat y adjuntos.
PostgreSQL contiene `users`, `audit_logs`, `customers`, `repair_orders`,
`repair_status_events`, `repair_quotes`, `inventory_items`,
`inventory_movements`, `chat_messages`, `repair_attachments`,
`notification_templates` y `customer_notifications` tras ejecutar migraciones.

## Criterio de actualizacion

Al cerrar una tarea relevante, mover su elemento desde "Pendiente" a "Base creada" o
anotar su estado en la seccion correspondiente. No marcar una capacidad como creada
hasta que cuente con una verificacion ejecutable o una prueba documentada.