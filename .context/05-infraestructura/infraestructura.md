# Infraestructura y despliegue — xTechJS

- **Dockerizado por completo**: backend, frontend, PostgreSQL, Redis y **MailHog**
  (servidor SMTP de pruebas) como servicios independientes, orquestados con
  `docker-compose` (y preparado para poder llevarse a un entorno de orquestación
  mayor en el futuro, ej. Kubernetes).
- Variables de entorno gestionadas vía `@xtaskjs/config`, con validación de esquema.
- Backend y frontend deben poder desplegarse y escalar de forma independiente.

## MailHog (SMTP de pruebas)

Para poder verificar en desarrollo y en Docker los correos transaccionales (email
de invitación de registro de cliente, y cualquier otro futuro: recuperación de
contraseña, notificaciones de estado de reparación) **sin enviar correos reales**,
se incorpora `mailhog/mailhog` como servicio adicional en `compose.yaml`:

- Puerto SMTP (`1025` por defecto) al que la API envía los correos vía
  `@xtaskjs/mailer`.
- Puerto de interfaz web (`8025` por defecto,
  `http://localhost:8025`) donde se puede leer el contenido completo de cada
  correo capturado, incluidos los enlaces de un solo uso.
- Sin volumen persistente: los correos capturados son solo para pruebas y se
  pierden al reiniciar el contenedor, lo cual es el comportamiento deseado.
- El servicio `api` debe declarar `mailhog` en su `depends_on` con
  `condition: service_healthy`, igual que ya hace con `postgres` y `redis`.
- Variables de entorno nuevas para la API: `SMTP_HOST`, `SMTP_PORT`,
  `SMTP_SECURE`, `MAIL_FROM`. Ver el detalle completo en
  `11-alta-clientes/registro-cliente.md` (sección 5).

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
