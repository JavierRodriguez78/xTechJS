# Multitienda — xTechJS

Este documento especifica cómo evolucionar xTechJS de **una sola tienda** a
**varias tiendas físicas** gestionadas desde la misma instalación, con:

- **Clientes compartidos** entre todas las tiendas (un mismo `Customer` puede
  tener reparaciones o pedidos en varias tiendas).
- **Reparaciones, empleados y almacén propios de cada tienda**, con
  posibilidad de **traspasos de stock entre tiendas**.
- Una **página principal del panel de administración** con los indicadores
  clave (nuevos clientes, ventas online, reparaciones en curso/finalizadas,
  etc.), que pueda verse agregada o filtrada por tienda.

Es un cambio **transversal**: toca prácticamente todos los BC ya
implementados (`users`, `repairs`, `inventory`, `payments`) más los dos
módulos nuevos ya especificados (`13-ecommerce-compraventa`,
`14-alta-reparacion`). No se reescribe nada desde cero: se añade un concepto
de `Store` y un campo `storeId` (o equivalente) donde corresponda, y se separa
lo que debe quedar compartido de lo que debe quedar por tienda.

## 1. Nuevo BC `stores`

```ts
export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  taxId: string | null;       // para poder emitir factura por establecimiento, ver 5.4
  invoiceSeriesPrefix: string; // p.ej. "VLC-" para numerar facturas por tienda, ver 5.4
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

- CRUD básico (`POST/GET/PATCH /api/stores`), solo accesible a admin con
  permiso `stores:manage`.
- Es la entidad raíz de la que cuelgan empleados, reparaciones, almacén y
  (opcionalmente) numeración de factura, según el resto de este documento.
- No tiene por qué ser compleja en v1: nombre, dirección y poco más. Se deja
  preparada para crecer (horario, email de contacto, etc.) sin bloquear el
  resto. La ficha completa de la tienda (dirección estructurada, identidad
  fiscal por tienda solo como excepción, VeriFactu) se especifica en
  `16-alta-tienda/alta-tienda.md`, que complementa este documento sin
  sustituirlo.

## 2. Empleados por tienda (`users`)

> **Actualización:** la gestión completa del empleado (alta, datos
> personales, DNI/NIE, protección de datos laborales) y el acceso a **varias**
> tiendas por empleado se especifican en
> `17-gestion-empleados/gestion-empleados.md`, que sustituye el modelo de
> `storeId` único descrito originalmente aquí por `defaultStoreId` +
> `storeAccess: string[] | null`. Lo que sigue queda como contexto histórico
> de por qué se introdujo el concepto de tienda en `users`; para el modelo de
> datos definitivo, usar siempre el documento 17.

- **Técnico**: pertenece a una o varias tiendas (`storeAccess`) y solo ve/
  gestiona las reparaciones y el almacén de esas tiendas.
- **Admin**: `storeAccess: null` (acceso global, ve y gestiona todas las
  tiendas, incluye el dashboard agregado de la sección 4) o acotado a una o
  varias tiendas concretas (admin "de tienda").
- **Cliente**: no lleva tienda asociada — ver sección 3.
- Todo endpoint que hoy filtra "por usuario autenticado" debe filtrar por
  pertenencia a `storeAccess` del usuario autenticado, salvo que sea `null`
  (acceso global). Esto afecta sobre todo a `repairs` e `inventory`
  (secciones 4 y 5 de este documento).

## 3. Clientes: compartidos entre tiendas

`Customer` **no** lleva `storeId`: un cliente que repara un móvil en la
tienda de Valencia puede comprar en la tienda de Castellón sin tener que
registrarse de nuevo, y el staff de cualquier tienda que atienda a ese
cliente ve su ficha e historial completo (filtrando después, en la propia
ficha, qué reparaciones/pedidos corresponden a cada tienda).

Se añade únicamente un campo informativo, igual que ya se hizo con
`acquisitionChannel` en `13-ecommerce-compraventa/ecommerce.md`:

```ts
export interface Customer {
  // ...campos ya existentes...
  originStoreId: string | null; // tienda donde se dio de alta (null si vino por /shop/register, ver 13)
}
```

No condiciona permisos ni visibilidad, solo sirve para informes ("clientes
nuevos captados por tienda").

## 4. Reparaciones por tienda (`repairs`)

```ts
export interface RepairOrder {
  // ...campos ya existentes...
  storeId: string; // obligatorio: tienda donde se recibió el equipo
}
```

- `CreateRepairOrder` requiere `storeId`. El frontend preselecciona
  `req.user.defaultStoreId` y permite elegir otra tienda de `storeAccess`;
  admin global elige entre todas. La API verifica el acceso del actor y que
  el técnico asignado también pertenezca al alcance de esa tienda.
- Los listados de reparaciones filtran por `storeAccess` (`null` significa
  alcance global); los selectores de recepción solo ofrecen tiendas
  accesibles. El cliente, al
  ver sus propias reparaciones, las ve todas independientemente de la
  tienda (son suyas), pero cada una muestra en qué tienda se gestiona.
- El chat (`chat`) y los adjuntos (`attachments`) cuelgan de `repairOrderId`;
  HTTP y websockets comprueban igualmente que `repair.storeId` pertenezca a
  `storeAccess`. Los avisos staff se envían a una sala por tienda más la sala
  general exclusiva del admin global; el portal de cliente valida propiedad.

## 5. Almacén por tienda, con traspasos (`inventory`)

Este es el cambio más delicado. Hoy `InventoryItem` mezcla dos cosas: la
**definición del artículo** (SKU, nombre, descripción, precio de venta, IVA)
y **su stock** (cantidad, stock mínimo), todo en una tabla única y global.
Para multitienda hace falta **separar ambas cosas**:

### 5.1. Catálogo compartido + stock por tienda

```ts
// Definición del artículo: compartida entre todas las tiendas (mismo SKU = mismo artículo en todas partes)
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  salePriceCents: number;
  taxRate: number;
  createdAt: Date;
  updatedAt: Date;
  // "stock" y "minimumStock" se eliminan de aquí, pasan a StoreInventoryStock
}

// Stock de ese artículo en una tienda concreta
export interface StoreInventoryStock {
  storeId: string;
  inventoryItemId: string;
  stock: number;
  minimumStock: number;
  updatedAt: Date;
}
```

- Migración: crear `store_inventory_stock` (clave compuesta
  `storeId + inventoryItemId`), y para cada `InventoryItem` existente crear
  una fila en la tienda por defecto (la primera/única tienda que exista en el
  momento de aplicar esta migración) con su `stock`/`minimumStock` actuales,
  antes de quitar esas dos columnas de `inventory_items`.
- `AdjustInventoryStock`, `ConsumeInventoryForRepair`,
  `ListLowStockItems`, `GetInventoryMovements` pasan a operar sobre
  `StoreInventoryStock` filtrado por `storeId` (el de la reparación en el
  caso de `ConsumeInventoryForRepair`, el seleccionado dentro de
  `storeAccess` en el resto, salvo admin global). La creación del artículo
  compartido solo inicializa stock en las tiendas autorizadas para el actor.
- `InventoryMovement` gana un campo `storeId` (en qué tienda ocurrió el
  movimiento), que para un consumo ligado a una reparación debe coincidir con
  el `storeId` de esa reparación — si no coincide, debe rechazarse (no se
  puede consumir stock de la tienda A para una reparación de la tienda B;
  para eso está el traspaso, ver 5.2).

### 5.2. Traspasos de stock entre tiendas

```ts
export interface StockTransferLine {
  inventoryItemId: string;
  quantity: number;
}

export interface StockTransferOrder {
  id: string;
  originStoreId: string;
  destinationStoreId: string;
  lines: StockTransferLine[];
  status: "draft" | "in_transit" | "received" | "cancelled";
  createdAt: Date;
  sentAt: Date | null;
  receivedAt: Date | null;
}
```

- **Flujo**: la tienda de origen crea el traspaso (`draft`), lo envía
  (`in_transit`: descuenta el stock de origen con un
  `InventoryMovement` de tipo nuevo `transfer_out`, referenciando
  `stockTransferOrderId` en vez de `repairOrderId`); la tienda de destino lo
  recibe (`received`: añade el stock a destino con un movimiento
  `transfer_in`). Si se cancela en `draft`, no afecta a ningún stock; **no se
  puede cancelar una vez en tránsito** sin un traspaso de vuelta explícito,
  para no perder trazabilidad de dónde está físicamente el material.
- `InventoryMovementType` pasa de `"receipt" | "adjustment" | "consumption"` a
  incluir `"transfer_out" | "transfer_in"`.
- Endpoints actuales: `POST /api/inventory/transfers`, `POST
  /api/inventory/transfers/:id/send`, `POST /api/inventory/transfers/:id/receive`,
  `POST /api/inventory/transfers/:id/cancel`, `GET /api/inventory/transfers` (filtrado
  por tienda de origen o destino del usuario autenticado).
- Permiso nuevo: `inventory:transfer`; técnico y admin pueden operar dentro
  de su alcance. Origen y destino del traspaso deben estar en las tiendas
  accesibles del usuario.

### 5.3. Proveedores y compras

`Supplier` permanece compartido. `PurchaseOrder.storeId` es la tienda que
recibe el pedido; las consultas y recepciones quedan filtradas por `storeAccess`
y la recepción aumenta el stock de esa tienda.

### 5.4. Facturación por tienda

`CashRegister` es una caja física por tienda: se añade `storeId` y la clave de
apertura pasa a ser `storeId + businessDate`. Los listados, resúmenes y cierres
usan pagos de reparaciones de la tienda seleccionada.

`InvoiceDraft`/factura también gana `storeId` (heredado de la reparación o
del pedido online que la origina). La numeración de factura por serie fiscal
española puede llevar el prefijo `Store.invoiceSeriesPrefix` (sección 1) para
que cada establecimiento tenga su propia serie, cumpliendo con la práctica
habitual de llevar series de facturación diferenciadas por punto de venta —
esto debe confirmarse con quien lleve la contabilidad del negocio antes de
fijarlo en producción, igual que ya se advierte en
`11-alta-clientes/registro-cliente.md` para el resto de aspectos fiscales.

### 5.5. Tienda online (`ecommerce`, ver 13)

Cada `EcommerceProduct` (`13-ecommerce-compraventa/ecommerce.md`) pasa a
llevar un `fulfillingStoreId`: la tienda física desde la que se prepara y
envía ese producto cuando se vende online. En v1 no hace falta un almacén
"online" centralizado ni un algoritmo de reparto automático entre tiendas:
cada producto se publica ya asociado a la tienda que lo tiene en stock
(reutilizando `StoreInventoryStock` de la sección 5.1 si se optó por la
opción A de "BC separado" en el documento 13, el stock de `EcommerceProduct`
puede en su lugar modelarse igual, por tienda). `EcommerceOrder` hereda el
`storeId` de la línea de producto correspondiente para que esa tienda vea el
pedido en su propio panel.

## 6. Dashboard del panel de administración

Nueva página de inicio del panel admin (`/admin` o `/admin/dashboard`), con
los indicadores clave, consultados mediante un nuevo endpoint de solo lectura
`GET /api/admin/dashboard/summary?storeId=&from=&to=` (sin `storeId`, admin
global ve el agregado de todas las tiendas; con `storeId`, filtra a una):

- **Clientes nuevos** en el periodo (por `createdAt` de `Customer`, con
  desglose opcional por `acquisitionChannel`/`originStoreId`).
- **Ventas online**: número e importe de `EcommerceOrder` en estado `paid` o
  posterior, en el periodo.
- **Reparaciones en curso**: conteo de `RepairOrder` agrupado por estado
  (recibido, en diagnóstico, en reparación, etc., según
  `RepairWorkflowConfig` ya existente).
- **Reparaciones finalizadas**: conteo de `RepairOrder` en estado terminal
  (reparado/entregado) en el periodo, con importe facturado asociado.
- Opcionalmente (mejora incremental, no bloqueante): alertas de stock bajo
  (`ListLowStockItems`, ya implementado, filtrado por tienda), solicitudes de
  compra a particulares pendientes de propuesta (`TradeInRequest` en
  `submitted`/`in_review`, ver `13-ecommerce-compraventa/ecommerce.md`).
- Este endpoint solo agrega consultas ya existentes (no inventa nuevas
  tablas): es un caso de uso de composición, `GetAdminDashboardSummary`, que
  llama a los repositorios/queries ya implementados de cada BC y compone el
  resultado.
- Frontend: `DashboardOverview.vue`, con un selector de tienda visible solo
  para admin global (para el resto, los datos se limitan a `storeAccess`), y
  un selector de rango de fechas. El panel general conserva tarjetas y el
  gráfico de reparaciones por estado; las vistas resumen por módulo y sus
  gráficas se describen en la sección 6.1.

### 6.1. Dashboards por módulo

Al seleccionar Atención, Almacén o Ventas en el menú superior se abre una vista
resumen del módulo, además de mantener los accesos laterales a sus listados y
fichas. Cada resumen comparte filtros de periodo y tienda y presenta
principalmente gráficos: reparaciones por estado/técnico; posiciones de stock,
movimientos y pedidos de compra; cobros por día/método y productos online
vendidos. Administración conserva el panel general.

Cada endpoint aplica el permiso funcional y `storeAccess`; los administradores
globales agregan todas las tiendas o filtran una, y los trabajadores solo ven
tiendas asignadas. Los pedidos online no tienen actualmente `storeId`, por lo
que sus ventas/productos solo se agregan al dashboard global y se omiten en
vistas acotadas. Los filtros no deben convertir esta ausencia de atribución en
ventas de una tienda concreta.

## 7. Permisos

No se añade un rol nuevo: se añade la noción de **alcance** (`storeAccess`) sobre
los roles ya existentes (sección 2). Nuevo permiso `stores:manage` (alta y
edición de tiendas, solo admin global). Nuevo permiso `inventory:transfer`
(sección 5.2). Los permisos operativos (`repairs:manage`, `inventory:manage`,
`inventory:transfer` y `payments:manage`) se aplican dentro del alcance de
`storeAccess`. Tiendas/configuración globales, auditoría, ecommerce,
compraventa y suplantación permanecen restringidos a administradores globales.

## 8. Decisiones abiertas

1. ~~¿Un técnico puede pertenecer a más de una tienda?~~ **Resuelta**: sí —
   ver `17-gestion-empleados/gestion-empleados.md` sección 3
   (`storeAccess: string[] | null`).
2. **¿Catálogo de inventario compartido (sección 5.1) o completamente
   independiente por tienda?** Este documento recomienda catálogo
   compartido + stock por tienda (mismo SKU en todas partes, con precio de
   venta común), que es lo más simple de mantener; si cada tienda necesita
   precios distintos para el mismo artículo, `salePriceCents` tendría que
   moverse también a `StoreInventoryStock`.
3. **¿Serie de factura por tienda (sección 5.4) o numeración única global?**
   Depende de cómo lleve la contabilidad el negocio; requiere confirmación
   antes de fijarse en producción.
4. **¿La tienda online (sección 5.5) reparte pedidos automáticamente entre
   tiendas según stock disponible, o cada producto pertenece siempre a una
   tienda fija?** Este documento especifica la opción simple (tienda fija por
   producto) para la v1.
5. **Migración de datos**: resuelta en la primera migración multitienda; se
  crea `Tienda principal` con ID estable y se asignan los datos anteriores.
  Empleados con `store_id` previo conservan esa tienda; técnicos históricos
  sin tienda reciben la principal. Nuevos administradores globales usan
  `storeAccess: null`.

## 9. Estado de implementación y pendientes

1. Implementado: BC `stores` con CRUD y control de permisos.
2. Implementado: los guards y filtros usan `defaultStoreId` y
  `storeAccess` (`null` = global); `storeId` se conserva como alias JWT
  de compatibilidad, no como columna en `users`.
3. Implementado: `RepairOrder.storeId` y `Customer.originStoreId`, con
  migración de históricos a `Tienda principal`.
4. Implementado: catálogo compartido, `StoreInventoryStock` y traspasos con
  ciclo draft/en tránsito/recibido/cancelado.
5. Implementado: `PurchaseOrder.storeId`, `CashRegister.storeId` y caja
  independiente por tienda. El `InvoiceDraft`/numerador fiscal online
  continúa sin tienda hasta que los pedidos ecommerce tengan fulfillment.
6. Pendiente: añadir `fulfillingStoreId`/`storeId` a
  `EcommerceProduct`/`EcommerceOrder` según la decisión abierta 4.
7. Implementado: dashboard `DashboardOverview.vue` y resumen limitado por
  `storeAccess` o agregado global.
8. Los módulos operativos aplican el scope; ecommerce, tienda global,
  configuración, auditoría, compraventa transversal y suplantación siguen
  reservados a administradores globales. El fulfillment de ecommerce por
  tienda y el `storeId` de factura online continúan pendientes, según 5.5.
