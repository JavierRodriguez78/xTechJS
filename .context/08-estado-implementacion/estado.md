# Estado de implementacion - xTechJS

**Actualizado:** 2026-09-11

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

## Cambios recientes (2026-09-11)

- Ajuste del dominio y contrato del cliente para incluir `registrationStatus` y
  campos de facturacion en `Customer` y `CreateCustomerInput`.
- El alta de cliente ya exige `email` y genera `registrationStatus: "pending"` al
  crear la entidad, con pruebas unitarias que cubren el requisito.
- La infraestructura SMTP de la API queda configurada para MailHog y preparada para
  envio de invitaciones transaccionales.
- Se ha dejado preparado el backend para la siguiente capa de frontend: validacion
  publica de token, registro del cliente y reenvio de invitacion. La vista web de
  autorregistro sigue pendiente en la UI.

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

- CRM: historial de interacciones y registro de notificaciones. Alta, listado,
  ficha, edicion, etiquetado e historial de reparaciones ya existen.
- Reparaciones: adjuntos y consumo de materiales. Ordenes, equipo basico, estados,
  timeline, diagnostico, asignacion, presupuesto interno y aprobacion desde portal
  de cliente ya existen.
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
  CQRS, `PaymentController` y trazabilidad. Ticket simplificado implementado como
  respuesta estructurada, resumen diario por método, cierre persistente de caja y
  reporte por rango con desglose por técnico/dispositivo. El ticket simplificado
  incluye cliente y reparación y dispone de descarga PDF; queda pendiente la
  facturación fiscal formal y sus requisitos legales.
- Chat y notificaciones en tiempo real.
- Administracion: usuarios, roles, configuracion, auditoria y dashboards.

### Frontend

- Router, arquitectura por features y cliente HTTP/WebSocket.
- Router y guards de navegacion por rol. El portal interno y el portal de cliente
  ya tienen entradas separadas, aunque la navegacion sigue siendo una bifurcacion
  simple por pathname y no un router Vue dedicado.
- Vistas funcionales para admin, tecnico y cliente.
- Formularios, validacion, estados de carga/error y conexion con API.
- Carga y reproduccion segura de fotos y videos.

### Infraestructura
- Ejecutar la migracion inicial contra PostgreSQL y comprobar `GET /api/users` con
  la base de datos levantada. Actualmente no hay datos semilla, por lo que devolvera
  una lista vacia hasta crear usuarios.
- Incorporar migraciones al proceso de despliegue de la API.
- Definir secretos por entorno y configuracion de produccion.
- Anadir CI para typecheck, tests, build e imagenes Docker.
- Preparar manifiestos o valores de despliegue para una futura plataforma de
  orquestacion, sin acoplar el codigo a ella.
- Incorporar Vitest u otro runner al frontend; hasta entonces `make test-web` solo
  valida tipos del cliente.

## Siguiente fase recomendada

1. Completar TPV con PDF/facturas fiscales, manteniendo el patron DI/CQRS ya validado.

Los cuatro modulos implementados (usuarios, CRM, reparaciones y almacen) usan el patron
xTaskJS completo: servicios `@Service` con `@Qualifier`, comandos/queries con
handlers `@CommandHandler`/`@QueryHandler`, controladores `@Controller` con guards
y repositorios registrados como instancias nombradas en `main.ts`. No quedan rutas
Fastify manuales. Patron a replicar en modulos futuros: almacen, TPV y chat.
PostgreSQL contiene `users`, `audit_logs`, `customers`, `repair_orders`,
`repair_status_events`, `repair_quotes`, `inventory_items` e
`inventory_movements` tras ejecutar migraciones.

## Criterio de actualizacion

Al cerrar una tarea relevante, mover su elemento desde "Pendiente" a "Base creada" o
anotar su estado en la seccion correspondiente. No marcar una capacidad como creada
hasta que cuente con una verificacion ejecutable o una prueba documentada.