# Gestión de proveedores — xTechJS

Este documento amplía la gestión de proveedores (`Supplier`, BC `inventory`)
ya implementada. Hoy un proveedor solo se puede **crear** (`POST
/api/inventory/suppliers`, con `name`, `email`, `phone`, `notes`,
`externalRef`, `website`) y **listar**: no hay edición, no hay ficha de
detalle, no hay baja, y no se guarda ningún dato fiscal ni de dirección, pese
a que ya existen pedidos de compra (`PurchaseOrder`) asociados a cada
proveedor y un catálogo de precios externo que crea proveedores
automáticamente (`19-catalogo-repuestos/catalogo-repuestos.md`).

Se ha revisado como referencia el planteamiento general de gestión de
proveedores habitual en el software de gestión de talleres de reparación
(alta/edición/baja con nombre, contacto y dirección), para contrastarlo con
lo que exige la normativa española de facturación y contabilidad y construir
sobre ello un modelo más completo. No se reproduce aquí el contenido de esa
referencia ni se cita la fuente.

No sustituye nada de lo ya implementado (`Supplier`, `PurchaseOrder`, el
catálogo de precios de proveedor): añade edición, baja, dirección
estructurada, identificación fiscal y condiciones comerciales.

## 1. Objetivo

- Poder **editar** un proveedor ya creado (hoy solo se puede crear).
- Poder darlo de **baja** sin romper el histórico de pedidos de compra ni el
  catálogo de precios ya importado que lo referencian.
- Guardar los datos que hacen falta para registrar correctamente las
  **facturas recibidas** de ese proveedor conforme a la normativa española:
  identificación fiscal completa y dirección fiscal estructurada.
- Tener una **ficha de proveedor** con pestañas (datos generales, pedidos de
  compra, catálogo de repuestos vinculado), en vez de solo un listado plano.

## 2. Revisión de campos frente a la legislación española

- **Se mantiene** tal cual: `name` (nombre comercial), `email`, `phone`,
  `notes`, `externalRef`/`website` (ya implementados para la integración del
  catálogo de precios).
- **Se añade `legalName` (opcional)**: razón social del proveedor, cuando
  difiere del nombre comercial (`name`). Necesaria para que la factura
  recibida pueda registrarse a nombre de la entidad legal correcta, igual que
  ya se distingue `displayName`/`billingName` en `Customer`.
- **Se añade `taxId` (opcional, pero recomendado)**: NIF/CIF del proveedor.
  El Reglamento de facturación (RD 1619/2012) y el libro registro de
  facturas recibidas (normativa del IVA) exigen poder identificar
  fiscalmente a quien emite cada factura; sin este dato no se puede llevar
  correctamente la contabilidad de compras. Se deja opcional en el alta para
  no bloquear el flujo (por ejemplo, un proveedor creado automáticamente por
  la integración del catálogo de precios no lo conoce), pero debe exigirse
  antes de registrar la primera factura recibida de ese proveedor.
- **Se añade dirección fiscal estructurada**, reutilizando el mismo patrón de
  5 campos y el mismo componente `AddressFields.vue` ya usado en `Store`,
  `User`/empleado y `Customer`: `addressStreet`, `addressPostalCode`,
  `addressCity`, `addressProvince`, `addressCountry`. Sustituye a la
  dirección de una sola línea de texto libre que menciona la referencia
  consultada, igual que se descartó para `Customer` en
  `18-gestion-clientes/gestion-clientes.md`.
- **Se añade `secondaryPhone` (opcional)**: para poder guardar un segundo
  contacto telefónico (p. ej. móvil del comercial asignado) sin forzar que
  `phone` sea una lista.
- **Se añade `paymentTermDays` (opcional, entero)**: plazo de pago pactado
  con el proveedor, en días. Relevante porque la Ley 3/2004, de medidas
  contra la morosidad en las operaciones comerciales, fija un plazo máximo
  legal de pago a proveedores (con carácter general 60 días naturales desde
  la recepción de la mercancía o prestación del servicio, salvo pacto
  expreso dentro de ese límite); guardar el plazo pactado permite más
  adelante avisar de facturas próximas a vencer sin incumplir ese máximo.
  Este documento no implementa esa alerta, solo deja el dato disponible.
- **Se añade `category` (opcional, texto libre o catálogo cerrado a
  decidir)**: para poder clasificar proveedores (repuestos, equipos para
  reventa, servicios, suministros) y filtrar por tipo en el listado.
- **No se incorpora** ningún dato bancario (IBAN, cuenta) en esta fase: a
  diferencia del NIF/dirección, un IBAN es un dato más sensible desde el
  punto de vista de seguridad y xTechJS no tiene hoy ningún mecanismo de
  cifrado a nivel de campo para datos de este tipo (el DNI/NIE del empleado,
  el otro dato equivalente ya implementado, se trata con visibilidad
  restringida mediante una acción explícita "mostrar", no con cifrado real).
  Se deja como decisión abierta (sección 5) en vez de implementarse sin esa
  protección.
- **No se incorpora** ninguna acción de **borrado físico** del proveedor: un
  proveedor con pedidos de compra ya registrados, o con elementos del
  catálogo de precios vinculados, no se puede eliminar sin perder
  trazabilidad contable (las facturas recibidas deben conservarse, con sus
  datos del emisor, un mínimo de 4 años según la normativa tributaria y 6
  años según el Código de Comercio). En su lugar se implementa una **baja
  (desactivación)**, con el mismo criterio ya aplicado a empleados en
  `17-gestion-empleados/gestion-empleados.md`: el proveedor desactivado deja
  de aparecer como opción al crear un nuevo pedido de compra o al vincular
  nuevos elementos del catálogo, pero su histórico permanece intacto y
  consultable.

## 3. Modelo de dominio

```ts
export interface Supplier {
  // ...campos ya existentes: id, name, email, phone, notes, externalRef, website...
  legalName: string | null;
  taxId: string | null;
  addressStreet: string | null;
  addressPostalCode: string | null;
  addressCity: string | null;
  addressProvince: string | null;
  addressCountry: string | null;
  secondaryPhone: string | null;
  paymentTermDays: number | null;
  category: string | null;
  active: boolean;           // true por defecto; false = dado de baja
  deactivatedAt: Date | null;
}

export interface UpdateSupplierInput {
  name?: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  secondaryPhone?: string | null;
  addressStreet?: string | null;
  addressPostalCode?: string | null;
  addressCity?: string | null;
  addressProvince?: string | null;
  addressCountry?: string | null;
  paymentTermDays?: number | null;
  category?: string | null;
  notes?: string | null;
  website?: string | null;
}
```

- `CreateSupplierInput` se amplía con los mismos campos nuevos, todos
  opcionales salvo `name` (igual que hoy).
- La baja (`active: false`, `deactivatedAt`) nunca borra la fila: es
  exactamente el mismo criterio de "baja = desactivación, nunca borrado
  físico" ya aplicado a empleados.

## 4. Impacto en la API existente

- **`PATCH /api/inventory/suppliers/:id`** (nuevo): edición parcial con los
  campos de `UpdateSupplierInput`, protegido con `PERMISSIONS.inventoryManage`
  igual que el resto del controlador.
- **`GET /api/inventory/suppliers/:id`** (nuevo): ficha de detalle de un
  proveedor.
- **`POST /api/inventory/suppliers/:id/deactivate`** (nuevo): marca
  `active: false` y `deactivatedAt: now()`. No permite reactivar
  automáticamente al crear un nuevo pedido de compra; una reactivación
  explícita (`POST /api/inventory/suppliers/:id/reactivate`) debe ser una
  acción deliberada del staff.
- **`GET /api/inventory/suppliers`**: se amplía para aceptar filtros de
  listado (`q` sobre nombre/razón social/NIF, `category`, `active`), y para
  devolver también los nuevos campos.
- **`POST /api/inventory/suppliers`**: se amplía el esquema de validación con
  los campos nuevos (todos opcionales salvo `name`, igual que hoy).
- **Catálogo de precios de proveedor (`19-catalogo-repuestos`)**: cuando la
  integración automática crea un proveedor nuevo a partir del envío de la
  aplicación externa, los campos nuevos de esta ampliación (`legalName`,
  `taxId`, dirección, `paymentTermDays`, `category`) quedan sin rellenar,
  porque esa aplicación externa no los conoce; el staff debe completarlos
  manualmente desde la ficha del proveedor antes de registrar su primera
  factura recibida. No se modifica el contrato de ingesta ya especificado en
  `19-catalogo-repuestos/catalogo-repuestos.md`.
- **`PurchaseOrder`**: sin cambios en su modelo; al crear un pedido de compra
  nuevo, el selector de proveedor solo debe ofrecer proveedores con
  `active: true` (los desactivados siguen siendo visibles en pedidos ya
  existentes, pero no seleccionables para uno nuevo).

## 5. Decisiones abiertas

1. **Datos bancarios del proveedor (IBAN)**: no incluidos en esta fase por
   falta de un mecanismo de protección a nivel de campo. Si se necesitan
   para automatizar pagos por transferencia, debe decidirse antes cómo se
   protegen (cifrado en reposo, visibilidad restringida tipo "mostrar bajo
   petición" como el DNI del empleado, o ambas).
2. **Catálogo cerrado o libre para `category`**: esta fase lo deja como texto
   libre; se puede normalizar a una lista cerrada (repuestos, equipos,
   servicios, suministros) si se detecta dispersión de valores.
3. **Proveedores con el mismo NIF**: igual que se permitió como excepción en
   `Store` (varias tiendas del mismo negocio comparten NIF), no se impone
   unicidad sobre `taxId` en `Supplier`: dos fichas de proveedor distintas
   (p. ej. dos delegaciones comerciales de la misma empresa) pueden
   compartir NIF si el negocio las gestiona por separado.
4. **Alerta de vencimiento de pago**: `paymentTermDays` se guarda en esta
   fase, pero no se implementa ningún aviso automático de factura próxima a
   vencer; queda para una fase posterior de gestión de facturación de
   compras, si se decide abordarla.

## 6. Frontend

- **Ficha de proveedor** (`/admin/proveedores/:id`), separada del listado
  (regla de oro de `04-frontend/frontend.md`), con pestañas como sub-rutas:
  - **Datos generales**: nombre, razón social, NIF, contacto (email,
    teléfono, teléfono secundario), dirección fiscal estructurada
    (reutilizando `AddressFields.vue`), categoría, condiciones de pago,
    notas, y el estado activo/baja con su fecha.
  - **Pedidos de compra**: historial de `PurchaseOrder` de ese proveedor
    (reutiliza el listado ya implementado, filtrado por `supplierId`).
  - **Catálogo de repuestos**: elementos de `SupplierCatalogItem` vinculados
    a este proveedor (reutiliza el listado ya implementado en
    `19-catalogo-repuestos`, filtrado por `supplierId` y paginado en servidor
    con el control común `AppPagination`; página y tamaño se conservan en la URL.
- **Alta de proveedor** (`/almacen/proveedores/nuevo`): formulario completo
  en una ruta y pantalla propias, separado del listado. Incluye nombre
  comercial, razón social, NIF/CIF, email, teléfonos, dirección fiscal
  estructurada, categoría, plazo de pago, web y notas. Reutiliza
  `AddressFields.vue`; al guardar navega a la ficha del proveedor.
- **Listado de proveedores** (`SupplierListView.vue`, ya existente): contiene
  solo filtros (texto por nombre/razón social/NIF, categoría y estado), tabla
  con estado y navegación a la ficha o al alta. No comparte pantalla con el
  formulario de alta ni con formularios de edición.
- Acción "Dar de baja" en la ficha, con confirmación, y "Reactivar" visible
  solo sobre un proveedor dado de baja.

## 7. Petición para ChatGPT

1. Ampliar `Supplier`/`CreateSupplierInput` con los campos de la sección 3
   (migración incluida), manteniendo los ya existentes sin cambios.
2. Implementar `UpdateSupplier`, `DeactivateSupplier` y `ReactivateSupplier`
   como nuevos casos de uso, siguiendo el patrón `@Service` + CQRS ya
   establecido en el resto de `inventory`.
3. Implementar los endpoints nuevos de la sección 4
   (`GET/PATCH /api/inventory/suppliers/:id`,
   `POST /api/inventory/suppliers/:id/deactivate`,
   `POST /api/inventory/suppliers/:id/reactivate`), y ampliar
   `GET /api/inventory/suppliers` con los filtros descritos.
4. Hacer que el selector de proveedor al crear un `PurchaseOrder` nuevo solo
   ofrezca proveedores con `active: true`.
5. Implementar la ficha de proveedor con sus tres pestañas y ampliar el
  listado existente, según la sección 6.
6. Mantener el alta en `/almacen/proveedores/nuevo`, con todos los campos
  editables de perfil separados del listado y usando `AddressFields.vue`.
