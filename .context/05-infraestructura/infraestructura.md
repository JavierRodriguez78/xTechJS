# Infraestructura y despliegue — xTechJS

- **Dockerizado por completo**: backend, frontend, PostgreSQL y Redis como servicios independientes, orquestados con `docker-compose` (y preparado para poder llevarse a un entorno de orquestación mayor en el futuro, ej. Kubernetes).
- Variables de entorno gestionadas vía `@xtaskjs/config`, con validación de esquema.
- Backend y frontend deben poder desplegarse y escalar de forma independiente.

## Operativa de desarrollo

El `Makefile` de la raiz es la interfaz operativa del proyecto. Sus objetivos cubren
instalacion, desarrollo local, ciclo de vida Docker, acceso a contenedores, migraciones,
tests, typecheck y build.

- `make help` lista los objetivos disponibles.
- `make dev` inicia API y frontend en local; `make db-up` inicia solo PostgreSQL y Redis.
- `make up`, `make down`, `make rebuild`, `make ps` y `make logs` gestionan la pila Docker.
- `make shell-api`, `make shell-web`, `make shell-db` y `make shell-redis` dan acceso a los servicios.
- `make migrate` ejecuta las migraciones dentro de la API Dockerizada.
- `make test`, `make typecheck` y `make build` validan el workspace. Hasta incorporar un
	runner de pruebas Vue, `make test-web` ejecuta el typecheck del frontend.
