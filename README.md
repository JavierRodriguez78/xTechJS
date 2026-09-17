# xTechJS

Plataforma de gestion para un laboratorio tecnico de reparaciones.

## Estructura

- `apps/api`: API TypeScript organizada por contextos de dominio.
- `apps/web`: consola web Vue 3 para administracion, tecnicos y clientes.
- `.context`: especificacion funcional y tecnica del proyecto.

## Comandos habituales

El `Makefile` de la raiz centraliza los flujos de trabajo. Ejecuta `make help` para
ver el listado completo.

| Objetivo | Accion |
| --- | --- |
| `make install` | Instala las dependencias. |
| `make dev` | Inicia API y frontend en desarrollo local. |
| `make db-up` / `make db-down` | Inicia o detiene PostgreSQL y Redis para desarrollo local. |
| `make up` / `make down` | Construye e inicia, o detiene, toda la pila Docker. |
| `make prod-config` / `make prod-up` | Valida o inicia la pila de producción con secretos obligatorios. |
| `make ps`, `make logs`, `make logs-api` | Consulta el estado o los logs de los contenedores. |
| `make shell-api`, `make shell-web`, `make shell-db`, `make shell-redis` | Abre una consola en el servicio elegido. |
| `make migrate` | Construye la imagen API y ejecuta el migrador one-shot. |
| `make test`, `make test-api`, `make test-web` | Ejecuta las pruebas disponibles. `test-web` ejecuta typecheck hasta incorporar un runner de tests. |
| `make typecheck` / `make build` | Valida tipos o genera los artefactos de produccion. |

## Desarrollo local

```bash
cp .env.example .env
make install
make dev
```

Servicios de datos para desarrollo:

```bash
make db-up
```

La API queda disponible en `http://localhost:3000/health` y el cliente en `http://localhost:5173`.

## Autenticacion inicial

Configura un valor aleatorio de al menos 32 caracteres para `JWT_SECRET` en `.env`.
Con una base de datos vacia, crea el unico administrador inicial antes de iniciar sesion:

```bash
curl -X POST http://localhost:3000/api/auth/bootstrap \
	-H 'content-type: application/json' \
	-d '{"email":"admin@example.com","displayName":"Administrador","password":"una-contrasena-segura"}'
```

El inicio de sesion se realiza en `POST /api/auth/login`. La respuesta contiene un
`accessToken` JWT que debe enviarse como `Authorization: Bearer <token>` en las rutas
protegidas, como `GET /api/users`.

El frontend incluido en este repositorio es el portal interno de administracion y taller.
Su pagina de login usa `POST /api/auth/staff/login` y solo permite roles `admin` y
`technician`; conserva la sesion JWT en el navegador hasta pulsar "Salir". El futuro
portal de cliente usara una aplicacion y ruta de acceso independientes.

## Pila Docker completa

```bash
cp .env.example .env
make up
```

La aplicacion queda disponible en `http://localhost:8080`, con la API publicada en
`http://localhost:3000`. El frontend reenvia las llamadas a `/api` hacia el servicio `api`.
Antes de arrancar la API, Compose ejecuta el servicio `migrate` y exige que termine
correctamente. Las migraciones no se ejecutan dentro de cada réplica de la API.

Para detener la pila y conservar los datos:

```bash
make down
```

## Producción

No uses el `make up` de desarrollo para producción. Define en el entorno o en el
gestor de secretos, como mínimo, `POSTGRES_DB`, `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `JWT_SECRET` (mínimo 32 caracteres), `SMTP_HOST`,
`SMTP_PORT`, `SMTP_SECURE` y `MAIL_FROM`. Comprueba primero la configuración y
después arranca la pila:

```bash
make prod-config
make prod-up
```

El despliegue construye una única imagen `xtechjs-api`, ejecuta sus migraciones
como tarea one-shot y solo después inicia la API. CI aplica dos veces el conjunto
de migraciones sobre PostgreSQL vacío para verificar tanto el esquema como su
idempotencia.

La API rechaza en producción los valores `change-me` y
`development-only-secret-change-me-32`. No guardes secretos reales en `.env` bajo
control de versiones; `.env.example` solo contiene marcadores y valores locales.