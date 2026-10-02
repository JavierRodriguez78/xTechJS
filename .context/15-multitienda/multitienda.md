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
  resto.

## 2. Empleados por tienda (`users`)

Hoy `User` no tiene ningún concepto de tienda. Se añade:

```ts
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  storeId: string | null; // null = acceso global (todas las tiendas)
}
```

- **Técnico**: `storeId` obligatorio en v1 — un técnico pertenece a una
  tienda y solo ve/gestiona las reparaciones y el almacén de esa tienda. Que
  un técnico trabaje en varias tiendas a la vez se dejada como extensión
  futura (ver decisión abierta 6.1) para no complicar el modelo de permisos
  en la primera versión.
- **Admin**: `storeId` puede ser `null` (admin global, ve y gestiona todas
  las tiendas, incluye el dashboard agregado de la sección 4) o puede
  asignarse a una tienda concreta (admin "de tienda", con el mismo nivel de
  permisos pero acotado a su tienda) — útil si en el futuro hay un
  responsable por tienda sin ser dueño del negocio completo.
- **Cliente**: no lleva `storeId` — ver sección 3.
- Todo endpoint que hoy filtra "por usuario autenticado" debe empezar a
  filtrar también "por `storeId` del usuario autenticado", salvo que sea
  `null` (acceso global). Esto afecta sobre todo a `repairs` e `inventory`
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

- `CreateRepairOrder` pasa a requerir `storeId`. En la práctica, el frontend
  lo rellena solo con la tienda del usuario autenticado (`req.user.storeId`)
  si no es `null`; si es un admin global, se le deja elegir la tienda en el
  propio formulario de alta (`14-alta-reparacion/alta-reparacion.md`).
- Los listados de reparaciones (`ListRepairOrders`, portal de cliente) deben
  filtrar por `storeId` del usuario cuando no sea `null`, y permitir filtrar
  explícitamente por tienda cuando sí lo sea (admin global). El cliente, al
  ver sus propias reparaciones, las ve todas independientemente de la
  tienda (son suyas), pero cada una muestra en qué tienda se gestiona.
- El chat (`chat`) y los adjuntos (`attachments`) cuelgan de `repairOrderId`,
  así que no necesitan cambio: ya quedan acotados a la tienda de forma
  indirecta a través de la reparación.

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
  caso de `ConsumeInventoryForRepair`, el del usuario autenticado en el resto,
  salvo admin global).
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
- Endpoints: `POST /api/stock-transfers`, `POST
  /api/stock-transfers/:id/send`, `POST /api/stock-transfers/:id/receive`,
  `POST /api/stock-transfers/:id/cancel`, `GET /api/stock-transfers` (filtrado
  por tienda de origen o destino del usuario autenticado).
- Permiso nuevo: `inventory:transfer` (admin siempre; técnico solo si el
  negocio quiere delegarlo, configurable igual que el resto de permisos).

### 5.3. Proveedores y compras

`Supplier` y `PurchaseOrder` (ya implementados) pueden seguir siendo
compartidos (el mismo proveedor sirve a varias tiendas) añadiendo únicamente
`storeId` a `PurchaseOrder` (la tienda que recibe ese pedido de compra), sin
tocar `Supplier`.

### 5.4. Facturación por tienda

`CashRegister` (cierre de caja) es, en la práctica, una caja física por
tienda: se añade `storeId` y la clave de apertura pasa a ser
`storeId + businessDate` en vez de solo `businessDate` (hoy solo puede haber
una caja abierta por día en todo el sistema, lo cual ya no tiene sentido con
varias tiendas cobrando a la vez).

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
  para admin global (para el resto de usuarios, queda fijo a su `storeId`), y
  un selector de rango de fechas. Tarjetas/contadores simples primero;
  gráficas (evolución de reparaciones o ventas en el tiempo) se dejan como
  mejora posterior si se pide explícitamente, para no sobredimensionar la
  primera versión del dashboard.

## 7. Permisos

No se añade un rol nuevo: se añade la noción de **alcance** (`storeId`) sobre
los roles ya existentes (sección 2). Nuevo permiso `stores:manage` (alta y
edición de tiendas, solo admin global). Nuevo permiso `inventory:transfer`
(sección 5.2). El resto de permisos ya existentes (`repairs:manage`,
`ecommerce:manage`, `tradein:manage`, etc.) se interpretan ahora "dentro del
alcance de `storeId` del usuario", sin necesidad de duplicarlos por tienda.

## 8. Decisiones abiertas

1. **¿Un técnico puede pertenecer a más de una tienda?** Este documento
   especifica v1 con una sola tienda por técnico (`storeId` único). Si el
   negocio necesita técnicos itinerantes entre tiendas, habría que pasar a
   `storeIds: string[]`, lo que afecta a todos los filtros de la sección 2 en
   adelante — mejor decidirlo antes de implementar que migrarlo después.
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
5. **Migración de datos**: antes de aplicar este documento hace falta decidir
   qué tienda es "la tienda por defecto" a la que se asignan todos los datos
   ya existentes (reparaciones, stock, empleados) en el momento de migrar,
   ya que hoy no existe ese concepto. Recomendado: crear una única `Store`
   con los datos fiscales actuales del negocio y asignarle todo lo existente
   antes de dar de alta una segunda tienda.

## 9. Petición para ChatGPT

1. Crear el BC `stores` con el CRUD básico de la sección 1.
2. Añadir `storeId` a `User` (sección 2) y a los guards/filtros de
   autorización existentes, de forma que cada consulta y mutación quede
   acotada al `storeId` del usuario autenticado salvo que sea `null`.
3. Añadir `storeId`/`originStoreId` a `RepairOrder` y `Customer`
   respectivamente (secciones 3 y 4), con la migración de datos de la
   decisión abierta 5.
4. Separar `InventoryItem` (catálogo) de `StoreInventoryStock` (stock por
   tienda), migrando los datos existentes a la tienda por defecto, e
   implementar `StockTransferOrder` con su flujo completo (sección 5.1 y
   5.2), sin romper `ConsumeInventoryForRepair` ni los tests ya existentes
   (`adjust-inventory-stock`, `consume-inventory-for-repair`, etc. — revisar
   y actualizar los tests afectados).
5. Añadir `storeId` a `CashRegister`, `InvoiceDraft`/factura y
   `PurchaseOrder` (sección 5.3 y 5.4), y el prefijo de serie de factura por
   tienda si se confirma la decisión abierta 3.
6. Añadir `fulfillingStoreId`/`storeId` a `EcommerceProduct`/`EcommerceOrder`
   (sección 5.5).
7. Implementar `GetAdminDashboardSummary` y la pantalla `DashboardOverview.vue`
   de la sección 6, como página de inicio del panel admin.
8. Actualizar `01-roles-permisos/roles.md` y el resto de documentos de
   `.context` que mencionen permisos para reflejar el alcance por `storeId`
   (no hace falta duplicarlos, basta con la nota de que se interpretan dentro
   del alcance del usuario).
