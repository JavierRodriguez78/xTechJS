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
- `12-informe-tecnico-reparacion/informe-tecnico.md` — Bitácora de pasos de reparación con soporte fotográfico (`RepairStep`), informe técnico en PDF descargable por staff y cliente, y nota de que la facturación automática de materiales consumidos (`ConsumeInventoryForRepair` → `InvoiceDraft`) **ya está implementada**
- `13-ecommerce-compraventa/ecommerce.md` — Autorregistro público sin invitación, tienda online (catálogo, carrito, pedidos, pago) y flujo de compra de equipos a particulares ("vende tu equipo") con valoración y propuesta económica
- `14-alta-reparacion/alta-reparacion.md` — Ficha de recepción de equipo ampliada (PIN cifrado, presupuesto inicial, checklist de condición pre/post, firma del cliente, resguardo en PDF)
- `15-multitienda/multitienda.md` — Soporte de varias tiendas: clientes compartidos, reparaciones/almacén/empleados por tienda, traspasos de stock entre tiendas, facturación por tienda, y dashboard principal del panel admin con indicadores clave
- `16-alta-tienda/alta-tienda.md` — Ficha de alta de tienda adaptada a la normativa española: dirección estructurada, identidad fiscal compartida por el negocio (NIF/razón social) salvo que una tienda sea una sociedad distinta, nota sobre VeriFactu y documentación de cumplimiento del establecimiento
- `17-gestion-empleados/gestion-empleados.md` — Gestión de empleados separada de la gestión genérica de usuarios: alta/edición/baja, acceso a una o varias tiendas (resuelve la decisión abierta de `15-multitienda`), y tratamiento de los datos del empleado conforme a RGPD/LOPDGDD en el ámbito laboral
- `18-gestion-clientes/gestion-clientes.md` — Unificación de direcciones de cliente (contacto y facturación) reutilizando el selector de provincia/ciudad/código postal, eliminación de la duplicación de datos entre el alta por staff y el autorregistro, nuevo flujo de verificación de email en tres pasos para el autorregistro público de la tienda (resuelve la decisión abierta nº4 de `13-ecommerce-compraventa`), y revisión del catálogo de campos del cliente frente a la legislación española
- `19-catalogo-repuestos/catalogo-repuestos.md` — Ingesta automática del catálogo de precios de repuestos que envía una aplicación externa propia: endpoint y contrato de integración (clave de API, alta automática del proveedor si no existe, carga por lotes idempotente), nueva entidad `SupplierCatalogItem`, y catálogo buscable por cualquier campo desde el panel para generar pedidos de compra
- `20-gestion-proveedores/gestion-proveedores.md` — Edición y baja (sin borrado físico) de proveedores, identificación fiscal (NIF/razón social), dirección estructurada y condiciones de pago conforme a la normativa española de facturación y conservación de documentos contables, y ficha de proveedor con pestañas (datos generales, pedidos de compra, catálogo de repuestos vinculado)

## Uso recomendado

1. Pega primero `00-general/resumen.md` para dar contexto inicial.
2. Ve añadiendo el resto de archivos según la parte de la app en la que estéis trabajando (por ejemplo, `03-backend/backend.md` cuando toque diseñar la arquitectura del servidor).
3. Consulta `08-estado-implementacion/estado.md` antes de continuar el desarrollo para conocer el punto de partida actual.
4. **Antes de seguir añadiendo funcionalidad**, pega `09-hallazgos-tecnicos/bug-arranque-userrepository.md` — describe un bug de arranque en producción ya diagnosticado y reproducido, con el fix exacto a aplicar.
5. `10-referencia-xgestoria/patron-arranque.md` sirve de guía de estilo para los próximos módulos (almacén, TPV, chat).
6. Para implementar el autorregistro de clientes, pega `11-alta-clientes/registro-cliente.md` junto con `05-infraestructura/infraestructura.md` (MailHog) y `02-modulos-funcionales/modulos.md` (sección CRM actualizada).
7. Para implementar la bitácora de pasos de reparación con fotos y el informe técnico en PDF, pega `12-informe-tecnico-reparacion/informe-tecnico.md` junto con `02-modulos-funcionales/modulos.md` (sección de gestión de equipos y reparaciones actualizada). Ese fichero deja explícito que la facturación automática de materiales ya está implementada, para que ChatGPT no la reconstruya.
8. Para implementar la tienda online y la compra de equipos a particulares, pega `13-ecommerce-compraventa/ecommerce.md` junto con `01-roles-permisos/roles.md` (permisos nuevos de staff) y `11-alta-clientes/registro-cliente.md` (reutiliza el mismo `Customer` y el mismo consentimiento LOPD/RGPD). Revisa primero las decisiones abiertas de su sección 5 (pasarela de pago, modelo de stock, logística) antes de pedir la implementación completa.
9. Para mejorar el alta de orden de reparación (ficha de recepción con PIN, presupuesto inicial, checklist de condición y firma), pega `14-alta-reparacion/alta-reparacion.md` junto con `02-modulos-funcionales/modulos.md`. Revisa antes sus decisiones abiertas (catálogo de precios por avería, checklist configurable, firma obligatoria u opcional).
10. **Antes de implementar multitienda**, pega `15-multitienda/multitienda.md` junto con `01-roles-permisos/roles.md` y `02-modulos-funcionales/modulos.md`. Es un cambio transversal (toca usuarios, reparaciones, almacén, facturación y el dashboard admin): resuelve primero las decisiones abiertas que sigan pendientes (catálogo de inventario compartido o no, serie de factura por tienda, reparto de productos online, tienda por defecto en la migración — la decisión sobre técnicos en varias tiendas ya está resuelta en el punto 12) antes de pedirle a ChatGPT la implementación.
11. Para completar la ficha de alta de cada tienda (dirección estructurada, identidad fiscal, VeriFactu), pega `16-alta-tienda/alta-tienda.md` junto con `15-multitienda/multitienda.md`. Confirma antes con la gestoría la decisión abierta nº1 (si el NIF de facturación es único para todo el negocio o si alguna tienda factura con datos fiscales propios).
12. Para la gestión de empleados separada de usuarios (alta/edición/baja, acceso a varias tiendas, datos conforme a RGPD/LOPDGDD laboral), pega `17-gestion-empleados/gestion-empleados.md` junto con `15-multitienda/multitienda.md` y `16-alta-tienda/alta-tienda.md` (reutiliza su selector de provincia/ciudad/código postal). Revisa antes sus decisiones abiertas (nómina/RRHH fuera de alcance, plazo de conservación, si se mantiene o no un listado genérico de "Usuarios").
13. Para unificar las direcciones del cliente, eliminar la duplicación de datos entre el alta por staff y el autorregistro, y añadir la verificación de email obligatoria en la tienda, pega `18-gestion-clientes/gestion-clientes.md` junto con `11-alta-clientes/registro-cliente.md`, `13-ecommerce-compraventa/ecommerce.md` y `16-alta-tienda/alta-tienda.md` (reutiliza su selector de provincia/ciudad/código postal).
14. Para la ingesta automática del catálogo de repuestos de proveedor (endpoint de integración, alta automática del proveedor, catálogo buscable por cualquier campo), pega `19-catalogo-repuestos/catalogo-repuestos.md` junto con `02-modulos-funcionales/modulos.md` (sección de almacén/stock actualizada). No depende de ningún otro fichero de `.context` para implementarse.
15. Para ampliar la gestión de proveedores (edición, baja, NIF/razón social, dirección estructurada, condiciones de pago, ficha con pestañas), pega `20-gestion-proveedores/gestion-proveedores.md` junto con `19-catalogo-repuestos/catalogo-repuestos.md` (los proveedores creados automáticamente por esa integración necesitan completarse con estos datos). Revisa antes su decisión abierta sobre datos bancarios del proveedor.
16. `07-entregables/entregables.md` sirve como guion de las peticiones concretas a hacer a ChatGPT.
17. **Siempre que se pida generar, revisar o modificar cualquier pantalla, pega
   `04-frontend/frontend.md` completo.** Su sección 2 ("Regla de oro de la UI")
   es normativa: prohíbe el patrón de listado y ficha editable en la misma
   pantalla, y obliga a rutas separadas de listado/detalle/edición con pestañas
   como sub-rutas y filtros en todos los listados. Sin ese fichero en contexto,
   las pantallas generadas reproducen el patrón antiguo que ya se ha descartado.
