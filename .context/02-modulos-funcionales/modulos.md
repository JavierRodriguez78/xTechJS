# Módulos funcionales — xTechJS

## CRM y gestión de clientes
- Alta, edición y ficha de cliente (datos de contacto, dirección, NIF/DNI si aplica, notas internas).
- **El email es obligatorio al dar de alta un cliente** (ya no opcional): es la vía
  para el autorregistro descrito a continuación.
- **Autorregistro del cliente tras el alta por staff**: al crear un cliente, se le
  envía un email con un enlace de un solo uso (caducidad recomendada 72h) para que
  complete su propio registro: fija su contraseña de acceso al portal `/customer`,
  aporta los datos de facturación necesarios para poder emitir factura (NIF/CIF,
  dirección fiscal, razón social si aplica), y **acepta la autorización de
  tratamiento de datos exigida por la LOPD-GDD/RGPD española**, con registro
  verificable de esa aceptación (texto/versión aceptada, fecha/hora, IP). El
  cliente queda en estado `pending` hasta completar el registro; el staff puede
  reenviar la invitación si el token caduca. Especificación completa en
  `11-alta-clientes/registro-cliente.md`.
- **Direcciones de contacto y facturación estructuradas** (calle, código
  postal, ciudad, provincia, país), reutilizando el mismo selector ya usado
  en tienda y empleado, con opción de "usar la misma dirección para
  facturación"; el formulario de autorregistro solo pide los datos que el
  staff no haya introducido ya. Especificación completa en
  `18-gestion-clientes/gestion-clientes.md`.
- Histórico de interacciones y reparaciones por cliente.
- Segmentación/etiquetado de clientes (particular, empresa, recurrente, etc.).
- Comunicaciones: registro de notificaciones enviadas (email, y opcionalmente SMS/WhatsApp) sobre cambios de estado de sus equipos.

## Gestión de equipos y reparaciones (taller)
- Alta de "orden de reparación" (ticket): equipo, cliente, tipo de dispositivo, avería reportada, accesorios entregados, estado inicial.
- **Ficha de recepción ampliada**: en el mismo alta, opcionalmente, PIN/contraseña de desbloqueo del equipo (cifrado, visible solo para staff), presupuesto inicial orientativo, checklist de condición del equipo pre-reparación (y post-reparación al entregar), firma táctil del cliente aceptando las condiciones del depósito, técnico asignado y fecha estimada de entrega, con resguardo de depósito descargable en PDF. Especificación completa en `14-alta-reparacion/alta-reparacion.md`.
- Flujo de estados configurable (ej.: recibido → en diagnóstico → presupuestado → aprobado por cliente → en reparación → en pruebas → reparado → entregado / no reparable → cancelado).
- Ficha técnica del equipo (marca, modelo, número de serie/identificador, tipo: consola actual, consola retro, móvil, electrodoméstico).
- Adjuntos por reparación: fotografías y vídeos del proceso, subidos por el técnico, visibles para el cliente y el admin.
- Registro de diagnóstico técnico, tiempo invertido, y materiales/repuestos consumidos (con vínculo directo al módulo de almacén).
- **Facturación automática de piezas consumidas:** cada consumo de material vinculado a una reparación debe crear o actualizar automáticamente una línea de la factura o borrador asociado. La línea conservará material, cantidad, precio unitario fiscal vigente al consumo, descuento, IVA y referencia al movimiento de almacén. El mismo movimiento nunca podrá generar dos líneas; la operación debe ser idempotente y transaccional con el consumo de stock. **(Ya implementado: `ConsumeInventoryForRepair` → `InvoiceDraft`.)**
- **Bitácora de pasos de reparación con soporte fotográfico e informe técnico en PDF**: el técnico puede registrar los pasos seguidos durante la reparación (título, descripción, fecha, técnico responsable), cada uno con sus propias fotos/vídeos, independiente del estado grueso de la reparación y del diagnóstico general. A partir de esos pasos se genera un informe técnico en PDF (con las fotos insertadas) descargable por staff y por el propio cliente desde su portal. Especificación completa en `12-informe-tecnico-reparacion/informe-tecnico.md`.
- Generación de presupuestos y aprobación por parte del cliente (idealmente desde su propio perfil).
- Historial completo y trazable de cada reparación (línea de tiempo de cambios de estado).

## Chat cliente-técnico
- Canal de mensajería asociado a cada orden de reparación (o general por cliente).
- Debe soportar texto y, si es posible, adjuntar imágenes/archivos.
- Notificaciones de nuevos mensajes.
- Accesible desde los tres roles según corresponda (cliente ↔ técnico, con visibilidad del admin).

## TPV (punto de venta / cobros)
- Registro de cobros asociados a reparaciones (a cuenta, presupuesto completo, venta de accesorios/repuestos sueltos).
- Métodos de pago (efectivo, tarjeta, transferencia; extensible a pasarelas de pago online para el perfil cliente).
- Emisión de tickets/facturas simplificadas y facturas estructuradas con numeración por serie.
- Las piezas consumidas se incorporan automáticamente a la factura asociada y no se vuelven a introducir manualmente. Si todavía no existe factura, se acumulan en el borrador de la reparación. Si la factura ya está emitida, no se modifica físicamente: debe activarse el flujo fiscal de factura rectificativa o abono que corresponda.
- Al enviar/generar una factura desde el TPV, debe poder enviarse al email fiscal del
  cliente mediante `@xtaskjs/mailer`, con registro de fecha, destinatario, resultado
  y correlación de la notificación. El envío debe incluir el PDF como adjunto y no
  debe exponer enlaces públicos sin autenticación.
- El cliente debe poder consultar y descargar las facturas de sus reparaciones desde
  el portal `/customer`, siempre tras validar la propiedad de la reparación y usando
  una descarga autenticada con JWT.
- Cierre de caja diario y reportes de facturación (por técnico, por periodo, por tipo de dispositivo).

## Gestión de almacén / stock
- Catálogo de materiales y repuestos (componentes electrónicos, piezas, pantallas, baterías, herramientas consumibles, etc.).
- Control de stock (entradas, salidas, stock mínimo, alertas de reposición).
- Vinculación de consumo de stock directamente desde la orden de reparación cuando el técnico registra materiales usados.
- **Gestión de proveedores** (alta, edición, ficha con pestañas, baja sin
  borrado físico): identificación fiscal (NIF/razón social), dirección
  estructurada, condiciones de pago y categoría, conforme a la normativa
  española de facturación y conservación de documentos contables.
  Especificación completa en `20-gestion-proveedores/gestion-proveedores.md`.
  Y, opcionalmente, órdenes de compra.
- Trazabilidad: qué reparación consumió qué material y en qué cantidad.
- **Catálogo de repuestos de proveedor alimentado automáticamente**: una
  aplicación externa propia envía periódicamente, por API, los precios y
  disponibilidad de repuestos que rastrea en varias tiendas especializadas;
  si el proveedor no existe en xTechJS se crea automáticamente, y el
  catálogo resultante se puede buscar por cualquier campo (nombre,
  proveedor, categoría, marca, modelo compatible, precio, disponibilidad)
  para decidir a quién comprar y generar el pedido de compra desde ahí.
  Especificación completa, incluido el endpoint y el contrato de integración,
  en `19-catalogo-repuestos/catalogo-repuestos.md`.

## Tienda online (ecommerce) y compra de equipos a particulares
- **Autorregistro público sin invitación previa, con verificación de email obligatoria**: cualquier visitante puede darse de alta por su cuenta en tres pasos (solicitud del email → verificación del enlace recibido → contraseña, datos y aceptación LOPD/RGPD) para poder comprar, sin necesidad de que el staff lo haya dado de alta antes por una reparación. No se crea ningún registro de cliente hasta verificar el email. Reutiliza el mismo `Customer` y el mismo login de `/customer` ya existentes. Especificación completa en `18-gestion-clientes/gestion-clientes.md` sección 3.
- **Catálogo público de productos a la venta**: consolas, consolas retro, juegos, móviles reparados/reacondicionados y accesorios, con fotos, condición (nuevo/reacondicionado/usado) y precio. Carrito, checkout y pago online (con una pasarela a decidir; arranca en modo manual/transferencia hasta integrarla).
- **Pedidos online**: historial de pedidos del cliente en su portal, descuento de stock al confirmar, factura generada y enviada automáticamente igual que en el TPV interno.
- **"Vende tu equipo" (valoración de compra a particulares)**: el cliente envía fotos y documentación de una consola, móvil, tablet o juego que quiere vender; el staff revisa, envía una propuesta económica y el cliente la acepta o rechaza. Al completarse, se registra el pago al cliente y, opcionalmente, el equipo pasa a formar parte del catálogo de venta.
- Especificación completa (modelo de datos, endpoints, decisiones abiertas sobre pasarela de pago y logística) en `13-ecommerce-compraventa/ecommerce.md`.

## Panel de administración
- **Gestión de empleados** (alta, edición, roles, acceso a una o varias tiendas y baja), separada de cualquier gestión genérica de usuarios, con los datos del empleado tratados conforme a la normativa española de protección de datos en el ámbito laboral (RGPD/LOPDGDD). Especificación completa en `17-gestion-empleados/gestion-empleados.md`.
- Gestión de usuarios y roles (alta, baja, edición, reseteo de credenciales).
- Función de suplantación de usuario (ver `01-roles-permisos/roles.md`), con auditoría.
- Configuración general (tipos de dispositivo, flujos de estado, plantillas de notificación, tarifas).
- Dashboards/reportes (reparaciones por estado, facturación, stock crítico, rendimiento por técnico).
- Al pulsar Atención, Almacén o Ventas en el menú superior se abre un dashboard del módulo con indicadores y gráficos; Administración conserva su panel general. Los datos se filtran por periodo y tienda según `storeAccess`: el administrador global puede agregar todas las tiendas y cada trabajador solo consulta su alcance. Las ventas online sin `storeId` solo se muestran al administrador global. Especificación y estado en `15-multitienda/multitienda.md` sección 6.
- **Página principal del panel con indicadores clave** (nuevos clientes, ventas online, reparaciones en curso y finalizadas, stock bajo), agregable globalmente o filtrable por tienda. Especificación completa en `15-multitienda/multitienda.md` sección 6.

## Multitienda
- El negocio puede operar **varias tiendas físicas** desde la misma instalación: cada tienda tiene sus propias reparaciones, su propio almacén/stock y sus propios empleados asignados.
- **Los clientes son compartidos** entre todas las tiendas: un mismo cliente puede tener reparaciones o pedidos en varias tiendas sin registrarse de nuevo.
- **Traspasos de stock entre tiendas**, con trazabilidad completa de qué tienda envía y cuál recibe cada traspaso.
- Un admin puede tener acceso global (todas las tiendas) o quedar acotado a una tienda concreta, igual que el resto del staff.
- Especificación completa (modelo de datos, migración de almacén y facturación, decisiones abiertas) en `15-multitienda/multitienda.md`.
