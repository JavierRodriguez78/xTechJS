# Estado de implementacion - xTechJS

**Actualizado:** 2026-09-03

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
- Matriz RBAC de permisos extensible y pruebas unitarias de roles.
- Dependencias xTaskJS declaradas para `core`, `common`, `config`, `cqrs`,
  `fastify-http`, `security`, `validation` y `value-objects`. `config` ya se usa
  desde la API; las demas se integraran al implementar sus capacidades.
- Cliente Vue 3 + TypeScript con una vista estatica de panel de taller. Los datos de
  resumen y ordenes son de ejemplo; no consume la API, no tiene router ni sesiones.
- Docker Compose declara cuatro servicios independientes: `web`, `api`, `postgres`
  y `redis`, con healthchecks y volumenes persistentes para datos.
- Imagen de API Node y una imagen de frontend Nginx con proxy interno de `/api` a
  `api:3000`.
- `Makefile` raiz para instalar dependencias, desarrollo local, Docker, shells de
  contenedores, migraciones, pruebas, typecheck y compilacion.

## Verificacion realizada

- `pnpm install --ignore-scripts` completado correctamente.
- `pnpm typecheck` completado correctamente para API y frontend.
- `pnpm --filter @xtechjs/api test`: 3 pruebas RBAC superadas, 0 fallos.
- `pnpm --filter @xtechjs/api build` completado correctamente despues de integrar
  la persistencia de usuarios con TypeORM.
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
- Autenticacion JWT, auditoria e impersonacion de administradores. El RBAC de dominio
  ya existe, pero aun no protege rutas HTTP ni hay inicio de sesion.
- Cache Redis, rate limiting, correo, scheduler, Socket.IO y adjuntos.
- Tests de dominio y aplicacion con `@xtaskjs/testing`.

### Funcionalidad

- CRM: clientes, etiquetas, historial y notificaciones.
- Reparaciones: ordenes, equipos, diagnostico, estados, presupuesto, timeline,
  adjuntos, consumo de materiales y aprobacion de cliente.
- Almacen: catalogo, stock, movimientos, alertas y proveedores.
- TPV: cobros, facturas/tickets, cierre de caja y reportes.
- Chat y notificaciones en tiempo real.
- Administracion: usuarios, roles, configuracion, auditoria y dashboards.

### Frontend

- Router, arquitectura por features y cliente HTTP/WebSocket.
- Autenticacion, almacenamiento de sesion y guards por rol.
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

1. Completar `usuarios/auth`: contraseñas, JWT, guards HTTP, auditoria e
  impersonacion.
2. Aplicar DI y el ciclo de vida de xTaskJS al modulo de usuarios.
3. Implementar el primer vertical funcional: alta y consulta de clientes protegidas
  por permisos, con su pantalla administrativa en Vue.
4. Ejecutar y validar la pila Docker completa antes de incorporar servicios que
   dependan de ella.

## Punto de reanudacion

El siguiente trabajo debe comenzar en `apps/api/src/users`: implementar credenciales,
JWT y guards HTTP sobre el modulo de usuarios existente. PostgreSQL ya tiene entidad
`users`, repositorio TypeORM y migracion inicial; aun no hay datos semilla ni tabla de
credenciales. El adaptador `InMemoryUserRepository` se conserva solo para pruebas
aisladas y no debe utilizarse como almacenamiento de produccion.

## Criterio de actualizacion

Al cerrar una tarea relevante, mover su elemento desde "Pendiente" a "Base creada" o
anotar su estado en la seccion correspondiente. No marcar una capacidad como creada
hasta que cuente con una verificacion ejecutable o una prueba documentada.