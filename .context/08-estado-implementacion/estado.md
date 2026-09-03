# Estado de implementacion - xTechJS

**Actualizado:** 2026-09-02

Este documento complementa la especificacion funcional. Describe exclusivamente lo que
existe en el repositorio a esta fecha y debe actualizarse al finalizar cada fase.

## Base creada

- Monorepo `pnpm` con `apps/api` y `apps/web`.
- API inicial TypeScript con Fastify y endpoint `GET /health`.
- Tipos de dominio iniciales: roles `admin`, `technician`, `customer` y estados de
  reparacion configurables por codigo.
- Dependencias xTaskJS declaradas para `core`, `common`, `config`, `cqrs`,
  `fastify-http`, `security`, `validation` y `value-objects`. Aun no se usan desde
  el codigo de la API.
- Cliente Vue 3 + TypeScript con una vista estatica de panel de taller. Los datos de
  resumen y ordenes son de ejemplo; no consume la API, no tiene router ni sesiones.
- Docker Compose declara cuatro servicios independientes: `web`, `api`, `postgres`
  y `redis`, con healthchecks y volumenes persistentes para datos.
- Imagen de API Node y una imagen de frontend Nginx con proxy interno de `/api` a
  `api:3000`.

## Verificacion realizada

- `pnpm install --ignore-scripts` completado correctamente.
- `pnpm typecheck` completado correctamente para API y frontend.
- `pnpm build` completado correctamente para API y frontend.
- `GET http://127.0.0.1:3000/health` respondio correctamente durante desarrollo local.
- No se pudo ejecutar `docker compose config` ni construir contenedores porque Docker
  CLI no esta disponible en la distribucion WSL actual. Se requiere habilitar la
  integracion WSL de Docker Desktop o instalar Docker CLI antes de validar la pila.

## Pendiente por area

### Backend y dominio

- Diseñar los bounded contexts y la estructura hexagonal definitiva para usuarios,
  clientes, reparaciones, almacen, TPV y chat.
- Configurar el kernel, DI, modulos y adaptador HTTP de xTaskJS; sustituir el arranque
  Fastify directo por la integracion de `@xtaskjs/fastify-http`.
- Implementar validacion de variables de entorno con `@xtaskjs/config`.
- Modelar agregados, value objects, puertos y repositorios.
- Configurar TypeORM, conexion PostgreSQL, migraciones y repositorios de infraestructura.
- Implementar CQRS: comandos, queries, handlers y proyecciones.
- Autenticacion JWT, RBAC extensible, auditoria e impersonacion de administradores.
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
- Incorporar migraciones al proceso de despliegue de la API.
- Definir secretos por entorno y configuracion de produccion.
- Anadir CI para typecheck, tests, build e imagenes Docker.
- Preparar manifiestos o valores de despliegue para una futura plataforma de
  orquestacion, sin acoplar el codigo a ella.

## Siguiente fase recomendada

1. Crear el modulo `usuarios/auth`: configuracion validada, entidad de usuario,
   contraseñas, JWT y RBAC.
2. Conectar PostgreSQL mediante TypeORM y crear las primeras migraciones para roles
   y usuarios.
3. Implementar el primer vertical funcional: alta y consulta de clientes protegidas
   por permisos, con su pantalla administrativa en Vue.
4. Ejecutar y validar la pila Docker completa antes de incorporar servicios que
   dependan de ella.

## Criterio de actualizacion

Al cerrar una tarea relevante, mover su elemento desde "Pendiente" a "Base creada" o
anotar su estado en la seccion correspondiente. No marcar una capacidad como creada
hasta que cuente con una verificacion ejecutable o una prueba documentada.