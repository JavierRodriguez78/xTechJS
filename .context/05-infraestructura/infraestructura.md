# Infraestructura y despliegue — xTechJS

- **Dockerizado por completo**: backend, frontend, PostgreSQL y Redis como servicios independientes, orquestados con `docker-compose` (y preparado para poder llevarse a un entorno de orquestación mayor en el futuro, ej. Kubernetes).
- Variables de entorno gestionadas vía `@xtaskjs/config`, con validación de esquema.
- Backend y frontend deben poder desplegarse y escalar de forma independiente.
