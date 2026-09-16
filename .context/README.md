# Contexto de proyecto: xTechJS

Este paquete contiene el contexto técnico y funcional completo del proyecto **xTechJS**, dividido por carpetas para poder pegarlo en ChatGPT de forma independiente por bloques, o todo junto si se prefiere.

## Estructura

- `00-general/resumen.md` — Resumen del proyecto
- `01-roles-permisos/roles.md` — Perfiles de usuario y permisos (admin, técnico, cliente)
- `02-modulos-funcionales/modulos.md` — CRM, gestión de equipos, chat, TPV, almacén, panel admin
- `03-backend/backend.md` — Requisitos técnicos de backend (xtaskjs, hexagonal, CQRS, PostgreSQL, Redis)
- `04-frontend/frontend.md` — Requisitos técnicos de frontend (Vue 3 + TypeScript) **y especificación normativa de UX: separación listado/detalle, pestañas como sub-rutas, filtros obligatorios**
- `05-infraestructura/infraestructura.md` — Docker y despliegue
- `06-extensibilidad/extensibilidad.md` — Requisitos de extensibilidad transversal
- `07-entregables/entregables.md` — Qué se espera que genere ChatGPT
- `08-estado-implementacion/estado.md` — Estado real, decisiones y trabajo pendiente
- `05-infraestructura/infraestructura.md` — Incluye los comandos operativos del Makefile
- `09-hallazgos-tecnicos/bug-arranque-userrepository.md` — Causa raíz confirmada del fallo de `make up` (`No component found with name: userRepository`) y fix recomendado
- `09-hallazgos-tecnicos/bug-arranque-mailer-verify.md` — Causa raíz y fix de un arranque colgado (sin error ni log) cuando el SMTP no responde a `verifyOnStart` del mailer
- `09-hallazgos-tecnicos/bug-arranque-socketgateway-constructor-injection.md` — Causa raíz y fix de un arranque roto al inyectar por constructor (en vez de por propiedad) repositorios TypeORM dentro de un `@SocketGateway()`
- `10-referencia-xgestoria/patron-arranque.md` — Comparativa con el backend de xGestoria (mismo stack xtaskjs) como referencia de arquitectura de arranque y convenciones DI
- `11-alta-clientes/registro-cliente.md` — Flujo de alta de cliente con email obligatorio, autorregistro (contraseña + datos de facturación), autorización LOPD/RGPD, y MailHog como SMTP de pruebas

## Uso recomendado

1. Pega primero `00-general/resumen.md` para dar contexto inicial.
2. Ve añadiendo el resto de archivos según la parte de la app en la que estéis trabajando (por ejemplo, `03-backend/backend.md` cuando toque diseñar la arquitectura del servidor).
3. Consulta `08-estado-implementacion/estado.md` antes de continuar el desarrollo para conocer el punto de partida actual.
4. **Antes de seguir añadiendo funcionalidad**, pega `09-hallazgos-tecnicos/bug-arranque-userrepository.md` — describe un bug de arranque en producción ya diagnosticado y reproducido, con el fix exacto a aplicar.
5. `10-referencia-xgestoria/patron-arranque.md` sirve de guía de estilo para los próximos módulos (almacén, TPV, chat).
6. Para implementar el autorregistro de clientes, pega `11-alta-clientes/registro-cliente.md` junto con `05-infraestructura/infraestructura.md` (MailHog) y `02-modulos-funcionales/modulos.md` (sección CRM actualizada).
7. `07-entregables/entregables.md` sirve como guion de las peticiones concretas a hacer a ChatGPT.
8. **Siempre que se pida generar, revisar o modificar cualquier pantalla, pega
   `04-frontend/frontend.md` completo.** Su sección 2 ("Regla de oro de la UI")
   es normativa: prohíbe el patrón de listado y ficha editable en la misma
   pantalla, y obliga a rutas separadas de listado/detalle/edición con pestañas
   como sub-rutas y filtros en todos los listados. Sin ese fichero en contexto,
   las pantallas generadas reproducen el patrón antiguo que ya se ha descartado.
