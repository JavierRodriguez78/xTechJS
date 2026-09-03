# Contexto de proyecto: xTechJS

Este paquete contiene el contexto técnico y funcional completo del proyecto **xTechJS**, dividido por carpetas para poder pegarlo en ChatGPT de forma independiente por bloques, o todo junto si se prefiere.

## Estructura

- `00-general/resumen.md` — Resumen del proyecto
- `01-roles-permisos/roles.md` — Perfiles de usuario y permisos (admin, técnico, cliente)
- `02-modulos-funcionales/modulos.md` — CRM, gestión de equipos, chat, TPV, almacén, panel admin
- `03-backend/backend.md` — Requisitos técnicos de backend (xtaskjs, hexagonal, CQRS, PostgreSQL, Redis)
- `04-frontend/frontend.md` — Requisitos técnicos de frontend (Vue 3 + TypeScript)
- `05-infraestructura/infraestructura.md` — Docker y despliegue
- `06-extensibilidad/extensibilidad.md` — Requisitos de extensibilidad transversal
- `07-entregables/entregables.md` — Qué se espera que genere ChatGPT
- `08-estado-implementacion/estado.md` — Estado real, decisiones y trabajo pendiente

## Uso recomendado

1. Pega primero `00-general/resumen.md` para dar contexto inicial.
2. Ve añadiendo el resto de archivos según la parte de la app en la que estéis trabajando (por ejemplo, `03-backend/backend.md` cuando toque diseñar la arquitectura del servidor).
3. Consulta `08-estado-implementacion/estado.md` antes de continuar el desarrollo para conocer el punto de partida actual.
4. `07-entregables/entregables.md` sirve como guion de las peticiones concretas a hacer a ChatGPT.
