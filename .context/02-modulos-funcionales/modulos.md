# Módulos funcionales — xTechJS

## CRM y gestión de clientes
- Alta, edición y ficha de cliente (datos de contacto, dirección, NIF/DNI si aplica, notas internas).
- Histórico de interacciones y reparaciones por cliente.
- Segmentación/etiquetado de clientes (particular, empresa, recurrente, etc.).
- Comunicaciones: registro de notificaciones enviadas (email, y opcionalmente SMS/WhatsApp) sobre cambios de estado de sus equipos.

## Gestión de equipos y reparaciones (taller)
- Alta de "orden de reparación" (ticket): equipo, cliente, tipo de dispositivo, avería reportada, accesorios entregados, estado inicial.
- Flujo de estados configurable (ej.: recibido → en diagnóstico → presupuestado → aprobado por cliente → en reparación → en pruebas → reparado → entregado / no reparable → cancelado).
- Ficha técnica del equipo (marca, modelo, número de serie/identificador, tipo: consola actual, consola retro, móvil, electrodoméstico).
- Adjuntos por reparación: fotografías y vídeos del proceso, subidos por el técnico, visibles para el cliente y el admin.
- Registro de diagnóstico técnico, tiempo invertido, y materiales/repuestos consumidos (con vínculo directo al módulo de almacén).
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
- Emisión de tickets/facturas simplificadas.
- Cierre de caja diario y reportes de facturación (por técnico, por periodo, por tipo de dispositivo).

## Gestión de almacén / stock
- Catálogo de materiales y repuestos (componentes electrónicos, piezas, pantallas, baterías, herramientas consumibles, etc.).
- Control de stock (entradas, salidas, stock mínimo, alertas de reposición).
- Vinculación de consumo de stock directamente desde la orden de reparación cuando el técnico registra materiales usados.
- Gestión de proveedores y, opcionalmente, órdenes de compra.
- Trazabilidad: qué reparación consumió qué material y en qué cantidad.

## Panel de administración
- Gestión de usuarios y roles (alta, baja, edición, reseteo de credenciales).
- Función de suplantación de usuario (ver `01-roles-permisos/roles.md`), con auditoría.
- Configuración general (tipos de dispositivo, flujos de estado, plantillas de notificación, tarifas).
- Dashboards/reportes (reparaciones por estado, facturación, stock crítico, rendimiento por técnico).
