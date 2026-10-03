# Ecommerce y compraventa de equipos — xTechJS

Este documento especifica dos capacidades nuevas, pensadas para abrir xTechJS al
público general (no solo a clientes con una reparación en curso):

1. **Tienda online (ecommerce)**: catálogo público de productos a la venta
   (consolas, consolas retro, juegos, móviles ya reparados/reacondicionados,
   accesorios), con carrito, checkout y pago online.
2. **Compra de equipos a particulares ("vende tu equipo" / valoración de
   compra)**: un visitante puede enviar fotos y documentación de una consola,
   móvil, tablet o juego que quiere vender, recibir una propuesta económica del
   laboratorio y aceptarla o rechazarla.

Ambas capacidades requieren que **cualquier visitante externo** (no solo un
cliente dado de alta por staff tras una reparación) pueda registrarse por su
cuenta. Esto completa `11-alta-clientes/registro-cliente.md`, que hoy solo
cubre el alta iniciada por staff.

No sustituye nada de lo ya implementado (CRM, reparaciones, TPV interno,
almacén, facturación automática de piezas, bitácora de reparación): es
funcionalidad nueva y aditiva, con su propio bounded context `ecommerce` y una
extensión del BC `customers`.

## 1. Autorregistro público (sin invitación previa)

Hoy (`11-alta-clientes/registro-cliente.md`) el `Customer` se crea siempre por
staff, que dispara un email con un token de registro. Para la tienda, el
visitante debe poder darse de alta **por iniciativa propia**, sin que nadie lo
haya creado antes.

- Nuevo endpoint público `POST /api/shop/register` (sin sesión): email,
  contraseña, nombre/razón social, teléfono, y aceptación obligatoria de la
  misma autorización LOPD/RGPD descrita en `11-alta-clientes/registro-cliente.md`
  sección 4 (mismo mecanismo de `DataProtectionConsent`, mismo registro de
  texto/versión/fecha/IP).
- El `Customer` resultante se crea directamente con `registrationStatus:
  "completed"` (no hay token de invitación porque nadie lo ha invitado), y un
  nuevo campo `acquisitionChannel: "staff" | "self_service"` para poder
  distinguir en informes de dónde viene cada cliente, sin que esto afecte al
  resto de la ficha de cliente ni al flujo de reparaciones.
- Verificación de email: recomendado enviar un email de confirmación (enlace de
  un solo uso) antes de activar la cuenta para compra, igual que ya se hace
  para el flujo de invitación, reutilizando `@xtaskjs/mailer` y MailHog en
  desarrollo. Puede marcarse como mejora de la fase 2 si se prefiere lanzar
  primero sin verificación de email.
- Los datos de facturación (NIF/CIF, dirección fiscal) pueden rellenarse en el
  propio registro o diferirse al primer checkout — ver sección 3.4. Recomendado
  diferirlos al checkout para no añadir fricción al alta.
- El login sigue siendo el mismo (`POST /api/auth/customer/login`): un cliente
  de tienda y un cliente de taller usan el mismo `Customer` y el mismo acceso a
  `/customer`; si más adelante ese mismo email pasa por una reparación, es el
  mismo registro, no uno duplicado (buscar por email antes de crear).

**Estado de implementación:** el alta pública está disponible en `/shop/register`
y envía `POST /api/shop/register` con email, contraseña, nombre, teléfono
opcional y aceptación expresa del texto de protección de datos usado por el
registro por invitación. El backend crea el cliente como `completed` con canal
`self_service`, guarda la evidencia del consentimiento y rechaza emails ya
registrados. Tras el alta, el cliente accede al login común. La verificación de
email no está implementada; el texto legal debe validarse antes de publicarse.
El portal `/customer` comparte una navegación lateral plegable y presenta
reparaciones, pedidos y solicitudes de compraventa en tablas con acceso a sus
detalles por ruta.

## 2. Catálogo y tienda (BC `ecommerce`, nuevo)

### 2.1. Producto en venta

```ts
export interface EcommerceProduct {
  id: string;
  sku: string;
  title: string;
  description: string;
  category: "console" | "retro_console" | "game" | "phone" | "tablet" | "accessory" | "other";
  condition: "new" | "refurbished" | "used_good" | "used_fair";
  priceCents: number;
  currency: "EUR";
  stockQuantity: number;
  photos: string[]; // referencias a attachments (ver 2.2)
  published: boolean;
  sourceInventoryItemId?: string; // enlace opcional al almacén interno (ver 2.3)
  sourceTradeInRequestId?: string; // si el producto proviene de una compra a un particular (ver 3)
  createdAt: Date;
  updatedAt: Date;
}
```

- `sku` único, generado o introducido por staff.
- `photos` reutiliza el módulo `attachments` igual que se hizo para
  `RepairStep` en `12-informe-tecnico-reparacion/informe-tecnico.md`: se añade
  un tercer campo opcional de enlace, `ecommerceProductId`, a
  `RepairAttachment` (que pasaría a ser un adjunto genérico, no solo de
  reparación — ver nota de nomenclatura en sección 2.5).
- Solo los productos con `published: true` y `stockQuantity > 0` aparecen en el
  catálogo público; staff puede despublicar sin borrar.

### 2.3. Relación con almacén (`inventory`)

**Decisión necesaria** (ver sección 5): hoy `inventory` modela consumibles y
repuestos para reparación (`InventoryItem`, consumo vía
`ConsumeInventoryForRepair`). Un producto de tienda (una consola ya reparada
para vender, por ejemplo) es conceptualmente distinto: no se "consume" en una
reparación, se vende entero a un cliente final. Dos opciones:

- **(A) BC separado (recomendado):** `EcommerceProduct` vive en su propio BC
  `ecommerce`, con su propio stock (`stockQuantity`), sin tocar `inventory`.
  Más simple, evita mezclar conceptos de "repuesto consumible" y "producto
  terminado". `sourceInventoryItemId` queda solo como referencia informativa
  opcional (por ejemplo, si una pieza de almacén se reutiliza como producto).
- **(B) Extender `inventory`** con un campo `itemKind: "repair_part" |
  "sellable_product"` sobre la entidad existente `InventoryItem`, y añadir los
  campos de tienda (`priceCents`, `published`, `photos`) solo cuando
  `itemKind === "sellable_product"`. Reutiliza el almacén existente pero
  complica el modelo y los casos de uso ya probados de consumo para
  reparación.

Este documento especifica la opción **(A)**, pero el desarrollador puede optar
por (B) si prefiere unificar el stock. Se deja como decisión abierta en la
sección 5 para no cerrarla sin el visto bueno del negocio.

### 2.4. Pedido online (`EcommerceOrder`)

```ts
export interface EcommerceOrderLine {
  productId: string;
  titleSnapshot: string;      // copia del título en el momento de la compra
  quantity: number;
  unitPriceCentsSnapshot: number;
}

export interface EcommerceOrder {
  id: string;
  customerId: string;
  lines: EcommerceOrderLine[];
  totalCents: number;
  status: "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled" | "refunded";
  shippingAddress: {
    street: string;
    postalCode: string;
    city: string;
    province: string;
    country: string;
  };
  paymentProvider: "redsys" | "stripe" | "manual"; // ver sección 5
  paymentReference?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

- El carrito es responsabilidad del frontend (estado local/sessionStorage)
  hasta el checkout; el backend solo ve el pedido ya formado al confirmar.
- Al confirmar el pedido: se valida stock disponible de cada línea, se
  descuenta `stockQuantity` de forma transaccional (mismo cuidado de
  idempotencia que ya aplica `ConsumeInventoryForRepair`), se crea el
  `EcommerceOrder` en `pending_payment` y se inicia el pago (sección 5).
- Tras confirmación de pago (webhook o callback de la pasarela), pasa a
  `paid`; si el pago falla o expira, se libera el stock reservado.
- El cliente ve su historial de pedidos en `/customer/orders`
  (`GET /api/customer/orders`, `GET /api/customer/orders/:id`), igual de
  protegido por propiedad que ya ocurre con las facturas de reparación.
- Al pasar a `paid`, se genera una factura simplificada o completa reutilizando
  exactamente el mismo generador de PDF (`pdfkit`) que ya usa `GetPaymentPdf`,
  y se envía por email igual que las facturas de reparación
  (`11-alta-clientes/registro-cliente.md` sección 5.1).

### 2.5. Adjuntos genéricos

El módulo `attachments` pasa a tener tres enlaces opcionales en vez de uno
(hoy implícitamente ligado solo a `RepairOrder`, y ya extendido en el punto 12
con `repairStepId`): `repairOrderId`, `repairStepId`, `ecommerceProductId`,
`tradeInRequestId` — exactamente uno debe estar presente por fila (constraint
`CHECK` en la migración). No es necesario renombrar la entidad si se prefiere
evitar el impacto en el código ya escrito; basta con añadir las dos columnas
nuevas, nullable, con su índice.

### 2.6. Frontend — tienda pública

- Nueva zona pública `/shop` (sin necesidad de sesión para navegar):
  `/shop` (listado con filtros por categoría/condición/precio),
  `/shop/products/:id` (ficha de producto con galería de fotos),
  `/shop/cart`, `/shop/checkout`.
- `/shop/register` y `/shop/login` reutilizan el mismo backend de
  autenticación de cliente ya existente.
- `/customer/orders` dentro del portal de cliente ya autenticado.
- Panel staff nuevo: `ProductCatalogManagement.vue` (alta/edición/publicación
  de productos, con subida de fotos) y `EcommerceOrdersManagement.vue`
  (listado de pedidos, cambio de estado de envío).
- Aplica la misma regla de UI normativa de `04-frontend/frontend.md` (listado y
  ficha en rutas separadas, filtros obligatorios en los listados).

## 3. Compra de equipos a particulares ("vende tu equipo")

### 3.1. Flujo funcional

1. Un visitante (registrado como cliente, ver sección 1) entra en
   `/customer/sell-to-us` (o `/shop/sell-to-us` si se prefiere accesible sin
   login previo, pidiendo login/registro antes de enviar el formulario) y
   rellena: tipo de equipo (consola, consola retro, móvil, tablet, juego),
   marca, modelo, descripción del estado (funciona/no funciona, golpes,
   pantalla, batería, accesorios incluidos), y adjunta **fotografías
   obligatorias** y, si aplica, **documentos** (factura de compra, certificado
   IMEI libre, etc.).
2. Se crea un `TradeInRequest` en estado `submitted`. El staff recibe una
   notificación (mismo mecanismo que ya existe para nuevos mensajes de chat o
   cambios de estado).
3. Un técnico/admin revisa la solicitud (`in_review`), valora el estado real a
   partir de las fotos/documentos y, si procede, introduce una **propuesta de
   compra** (importe) → estado `proposal_sent`. Puede añadir un comentario
   explicando la valoración (por ejemplo, descuentos por batería degradada).
4. El cliente ve la propuesta en su portal y la **acepta o rechaza**:
   - Aceptada → `accepted`. Se coordina la entrega física del equipo (recogida
     en tienda o envío; fuera de alcance de este documento el detalle
     logístico, ver decisión abierta en sección 5).
   - Rechazada → `rejected`, fin del flujo.
5. Cuando el equipo llega físicamente y se verifica que coincide con lo
   declarado, staff marca `completed`, se registra el pago al cliente (ver
   3.3) y, opcionalmente, se da de alta automáticamente como
   `EcommerceProduct` en el catálogo (enlazado vía `sourceTradeInRequestId`,
   sección 2.1) una vez el taller lo haya revisado/reparado si hiciera falta.

### 3.2. Modelo de dominio

```ts
export interface TradeInRequest {
  id: string;
  customerId: string;
  deviceType: "console" | "retro_console" | "game" | "phone" | "tablet" | "other";
  brand: string;
  model: string;
  conditionDescription: string;
  status: "submitted" | "in_review" | "proposal_sent" | "accepted" | "rejected" | "completed" | "cancelled";
  proposedAmountCents?: number;
  proposalNote?: string;
  finalAmountCents?: number;
  decidedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

- Fotos y documentos se guardan vía `attachments` con `tradeInRequestId`
  (sección 2.5); el formulario exige al menos una foto para poder enviar la
  solicitud.
- No hay algoritmo automático de tasación en esta fase: la propuesta la
  introduce siempre una persona. Dejarlo así explícito evita que ChatGPT
  invente un motor de pricing no pedido.

### 3.3. Pago al cliente

- El pago **del laboratorio al cliente** es conceptualmente el inverso de una
  venta: no encaja en el TPV actual (pensado para cobros, no para pagos
  salientes). Se registra como un movimiento simple:
  `method: "bank_transfer" | "cash" | "store_credit"`, importe, fecha,
  referencia — sin pretender implementar aquí una pasarela de pago saliente
  real (transferencias SEPA, etc.), que queda fuera de alcance y se gestiona
  manualmente por el staff marcando el movimiento como realizado.
- Si se ofrece `store_credit` (saldo a favor canjeable en la propia tienda),
  requiere un nuevo concepto de "saldo de cliente" — se deja como extensión
  futura opcional, no obligatoria para la primera versión.

### 3.4. Endpoints

- Cliente: `POST /api/customer/trade-in-requests` (con adjuntos),
  `GET /api/customer/trade-in-requests`,
  `GET /api/customer/trade-in-requests/:id`,
  `POST /api/customer/trade-in-requests/:id/accept`,
  `POST /api/customer/trade-in-requests/:id/reject`.
- Staff (permiso nuevo `tradein:manage`):
  `GET /api/trade-in-requests` (listado con filtros por estado),
  `GET /api/trade-in-requests/:id`,
  `PATCH /api/trade-in-requests/:id/review` (pasa a `in_review`),
  `PATCH /api/trade-in-requests/:id/propose` (`proposedAmountCents`,
  `proposalNote`, pasa a `proposal_sent`),
  `PATCH /api/trade-in-requests/:id/complete` (`finalAmountCents`, pasa a
  `completed`, registra el pago saliente).

### 3.5. Frontend

- `TradeInRequestForm.vue` en el portal de cliente: formulario + subida
  múltiple de fotos/documentos, siguiendo el mismo componente de subida ya
  usado para adjuntos de reparación.
- `TradeInRequestDetail.vue` (cliente): estado, propuesta recibida, botones
  aceptar/rechazar.
- `TradeInManagement.vue` (staff): listado filtrable por estado (regla de UI
  de `04-frontend/frontend.md`), ficha de detalle con galería de fotos/
  documentos y formulario de propuesta/cierre.

## 4. Roles y permisos

No se añade un rol nuevo: la tienda y la venta de equipos son capacidades del
rol **Cliente** ya existente (`01-roles-permisos/roles.md`), ahora accesibles
también a quien se autorregistra sin haber tenido nunca una reparación. Para
el staff se añaden dos permisos nuevos, compatibles con el RBAC ya previsto
como extensible:

- `ecommerce:manage` (gestión de catálogo y pedidos) — admin por defecto,
  asignable a un rol "encargado de tienda" si en el futuro se crea.
- `tradein:manage` (revisión y propuesta de compra a particulares) — admin y
  técnico por defecto, ya que requiere criterio técnico para valorar el
  estado real del equipo.

## 5. Decisiones abiertas (a resolver antes o durante el desarrollo)

1. **Modelo de stock de tienda**: BC `ecommerce` separado (opción A, la que
   especifica este documento) vs. extender `inventory` con `itemKind`
   (opción B). Afecta a cuánto código nuevo hace falta vs. cuánto se reutiliza.
2. **Pasarela de pago online**: este documento dimensiona el campo
   `paymentProvider` pero no elige proveedor. Hay que decidir entre una
   pasarela española (Redsys/Bizum) o internacional (Stripe), según con qué
   banco/TPV virtual trabaje el negocio; mientras no esté integrada, puede
   arrancarse con `paymentProvider: "manual"` (pago contra reembolso o
   transferencia, confirmado a mano por staff) para no bloquear el resto del
   desarrollo.
3. **Logística de envío/recogida**: ni la venta (envío de productos al
   cliente) ni la compra a particulares (recepción del equipo) incluyen aquí
   integración con transportistas ni cálculo automático de gastos de envío.
   Para la v1 se asume recogida/entrega en tienda o acuerdo manual por email,
   dejando el campo `shippingAddress` ya preparado para una integración futura.
4. **Verificación de email en el autorregistro público**: activar la cuenta al
   instante (fricción mínima) vs. exigir confirmación por email antes de
   poder comprar (más seguro frente a cuentas falsas). Este documento
   recomienda diferir la verificación a la fase 2.

## 6. Petición para ChatGPT

1. Implementar el autorregistro público (`POST /api/shop/register`) descrito
   en la sección 1, reutilizando el `DataProtectionConsent` ya implementado y
   buscando por email antes de crear para no duplicar un `Customer` existente.
2. Crear el BC `ecommerce` (opción A de la sección 2.3, salvo que el negocio
   decida la opción B) con `EcommerceProduct` y `EcommerceOrder`, siguiendo el
   mismo patrón `@Service` + CQRS + hexagonal ya usado en el resto del
   proyecto (ver `10-referencia-xgestoria/patron-arranque.md` como guía de
   estilo de arranque y DI).
3. Extender `attachments` con las columnas `ecommerceProductId` y
   `tradeInRequestId` (nullable, con `CHECK` de exclusividad), igual que ya se
   hizo con `repairStepId` en `12-informe-tecnico-reparacion/informe-tecnico.md`.
4. Implementar `TradeInRequest` y su flujo completo de estados (sección 3),
   incluyendo los endpoints de cliente y de staff de la sección 3.4.
5. Dejar `paymentProvider: "manual"` como implementación mínima funcional del
   checkout (sin integrar pasarela real) hasta que se resuelva la decisión
   abierta nº 2, de forma que el resto del flujo (carrito, pedido, stock,
   factura, email) quede operativo y probado de extremo a extremo.
6. Implementar el frontend público `/shop/*` y los paneles de staff
   `ProductCatalogManagement.vue`, `EcommerceOrdersManagement.vue` y
   `TradeInManagement.vue`, respetando la regla de UI de
   `04-frontend/frontend.md`.
7. Añadir tests de API para el flujo completo de compra (alta pública →
   catálogo → pedido → pago manual → factura) y del flujo de `TradeInRequest`
   (envío → propuesta → aceptación → completado), siguiendo el estilo de la
   suite de tests ya existente.
