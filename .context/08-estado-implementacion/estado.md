# Estado de implementacion - xTechJS

**Actualizado:** 2026-09-07

Este documento complementa la especificacion funcional. Describe exclusivamente lo que
existe en el repositorio a esta fecha y debe actualizarse al finalizar cada fase.

## Base creada

- Monorepo `pnpm` con `apps/api` y `apps/web`.
- API inicial TypeScript con Fastify y endpoint `GET /health`.
- Configuracion de API validada al arranque con Zod y `ConfigService` de
  `@xtaskjs/config` para los puertos y conexiones de PostgreSQL/Redis.
- Tipos de dominio iniciales: roles `admin`, `technician`, `customer` y estados de
  reparacion configurables por codigo.
- Modulo inicial de usuarios con entidad, puerto de repositorio, caso de uso de
  consulta, adaptador PostgreSQL y endpoint `GET /api/users`.
- Conexion PostgreSQL mediante TypeORM: `DataSource`, entidad `users`, repositorio
  TypeORM y migracion inicial. El contenedor de API ejecuta las migraciones antes de
  arrancar; en local se puede usar `pnpm --filter @xtechjs/api migration:run` tras
  compilar la API.
- Migracion incremental de credenciales para bases creadas antes de `password_hash`;
  evita que los volumenes PostgreSQL existentes requieran borrarse al desplegar auth.
- Matriz RBAC de permisos extensible y pruebas unitarias de roles.
- Autenticacion inicial: bootstrap de administrador, contraseñas con hash bcrypt,
  login JWT, guards HTTP por permiso y suplantacion de tecnico/cliente con auditoria
  en `audit_logs`. La autenticacion se implementa con `@fastify/jwt`; la integracion
  declarativa de `@xtaskjs/security` sigue pendiente junto al kernel de xTaskJS.
- Portal interno Vue protegido por login: usa `POST /api/auth/staff/login`, persiste
  el JWT y el perfil en `localStorage`, rechaza el rol `customer` y permite cerrar
  sesion. El portal de cliente queda pendiente como aplicacion independiente.
- Primer vertical CRM de clientes: entidad TypeORM, migracion, puerto y repositorio
  PostgreSQL, casos de uso para alta, listado, ficha y edicion. Expone rutas
  `GET`/`POST /api/customers` y `GET`/`PUT /api/customers/:id` protegidas por
  permisos. La consola Vue permite consultar, crear y editar clientes con JWT.
- Modulo inicial de reparaciones: ordenes vinculadas a cliente con equipo, averia y
  accesorios; persistencia TypeORM y migracion para `repair_orders` y su linea de
  tiempo `repair_status_events`. Expone `GET`/`POST /api/repairs`, cambio de estado
  por `PATCH /api/repairs/:id/status` e historial por `GET /api/repairs/:id/history`.
  La consola interna permite crear, listar y actualizar ordenes de taller.
- Reparaciones incorpora asignacion a tecnicos activos y diagnostico tecnico, con
  migracion incremental y ruta `PATCH /api/repairs/:id/technical`. La consola carga
  tecnicos autorizados desde `GET /api/technicians` y permite guardar ambos datos.
- Reparaciones incorpora un presupuesto vigente por orden, con lineas, cantidades e
  importes en centimos, total calculado en servidor y migracion `repair_quotes`.
  Las rutas internas son `GET`/`PUT /api/repairs/:id/quote` y
  `POST /api/repairs/:id/quote/approve`. Enviar desde diagnostico mueve la orden a
  `quoted`; aprobar un presupuesto enviado la mueve a `approved` y deja evento en
  el historial. La consola permite editar lineas, guardar borrador, enviar y
  registrar la aprobacion interna.
- Dependencias xTaskJS declaradas para `core`, `common`, `config`, `cqrs`,
  `fastify-http`, `security`, `validation` y `value-objects`. `config` ya se usa
  desde la API; las demas se integraran al implementar sus capacidades.
- Cliente Vue 3 + TypeScript con una vista estatica de panel de taller. Los datos de
  resumen y ordenes son de ejemplo; no consume la API, no tiene router ni sesiones.
- Docker Compose declara cuatro servicios independientes: `web`, `api`, `postgres`
  y `redis`, con healthchecks y volumenes persistentes para datos.
- Imagen de API Node y una imagen de frontend Nginx con proxy interno de `/api` a
  `api:3000`, preservando el prefijo `/api` necesario para las rutas Fastify.
- `Makefile` raiz para instalar dependencias, desarrollo local, Docker, shells de
  contenedores, migraciones, pruebas, typecheck y compilacion.

## Verificacion realizada

- `pnpm install --ignore-scripts` completado correctamente.
- `pnpm typecheck` completado correctamente para API y frontend.
- `pnpm --filter @xtechjs/api test`: 12 pruebas de RBAC, autenticacion, CRM y
  reparaciones superadas, 0 fallos, incluido el calculo del total de presupuesto.
- `pnpm --filter @xtechjs/api build` y `pnpm --filter @xtechjs/web build` completados
  correctamente tras incorporar presupuestos de reparacion.
- `GET http://127.0.0.1:3000/health` respondio correctamente durante desarrollo local.
- No se pudo ejecutar `docker compose config` ni construir contenedores porque Docker
  CLI no esta disponible en la distribucion WSL actual. Se requiere habilitar la
  integracion WSL de Docker Desktop o instalar Docker CLI antes de validar la pila.
- El Dockerfile de API utiliza `pnpm deploy --legacy --prod /opt/api`, correccion
  necesaria para pnpm 10+ sin `inject-workspace-packages`. Falta confirmar el build
  de esa capa con Docker disponible.

## Pendiente por area

### Backend y dominio

- Diseñar los bounded contexts y la estructura hexagonal definitiva para usuarios,
  clientes, reparaciones, almacen, TPV y chat.
- Configurar el kernel, DI, modulos y adaptador HTTP de xTaskJS; sustituir el arranque
  Fastify directo por la integracion de `@xtaskjs/fastify-http`.
- Modelar agregados, value objects, puertos y repositorios.
- Completar los repositorios y migraciones de los demas bounded contexts con TypeORM.
- Implementar CQRS: comandos, queries, handlers y proyecciones.
- Integrar la seguridad declarativa de `@xtaskjs/security` cuando se incorpore el
  kernel xTaskJS. JWT, RBAC HTTP, auditoria e impersonacion iniciales ya existen.
- Cache Redis, rate limiting, correo, scheduler, Socket.IO y adjuntos.
- Tests de dominio y aplicacion con `@xtaskjs/testing`.

### Funcionalidad

- CRM: historial de interacciones/reparaciones y registro de notificaciones. Alta,
  listado, ficha, edicion y etiquetado inicial ya existen.
- Reparaciones: adjuntos, consumo de materiales y aprobacion desde el portal de
  cliente. Ordenes, equipo basico, estados, timeline, diagnostico, asignacion y
  presupuesto interno ya existen.
- Almacen: catalogo, stock, movimientos, alertas y proveedores.
- TPV: cobros, facturas/tickets, cierre de caja y reportes.
- Chat y notificaciones en tiempo real.
- Administracion: usuarios, roles, configuracion, auditoria y dashboards.

### Frontend

- Router, arquitectura por features y cliente HTTP/WebSocket.
- Router y guards de navegacion por rol. El portal interno ya dispone de autenticacion
  persistente para admin/tecnico, pero aun no tiene router ni portal de cliente.
- Vistas funcionales para admin, tecnico y cliente.
- Formularios, validacion, estados de carga/error y conexion con API.
- Carga y reproduccion segura de fotos y videos.

### Infraestructura

- Validar `docker compose config`, `docker compose build` y el arranque completo
  cuando Docker este disponible.
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

1. Aplicar DI y el ciclo de vida de xTaskJS al modulo de usuarios.
2. Completar la aprobacion de presupuestos desde el portal de cliente, o el historial
  CRM usando las ordenes existentes.
3. Ejecutar y validar la pila Docker completa antes de incorporar servicios que
   dependan de ella.

## Punto de reanudacion

El siguiente trabajo debe comenzar en la aplicacion del kernel/DI de xTaskJS, en el
historial CRM del cliente o en la aprobacion de presupuestos por cliente. El portal interno solo es
accesible tras `POST /api/auth/staff/login` para admin/tecnico. El CRM ya expone
`GET`/`POST /api/customers` y `GET`/`PUT /api/customers/:id`; alta y edicion exigen
`customers:manage`, mientras las consultas requieren `customers:read`. La consola
muestra Clientes desde su navegacion y usa el access token obtenido con login.
PostgreSQL contiene `users`, `audit_logs`, `customers`, `repair_orders`,
`repair_status_events` y `repair_quotes` tras ejecutar migraciones. La orden incluye
`technician_id` y `diagnosis` tras la migracion incremental de detalles tecnicos.

## Criterio de actualizacion

Al cerrar una tarea relevante, mover su elemento desde "Pendiente" a "Base creada" o
anotar su estado en la seccion correspondiente. No marcar una capacidad como creada
hasta que cuente con una verificacion ejecutable o una prueba documentada.