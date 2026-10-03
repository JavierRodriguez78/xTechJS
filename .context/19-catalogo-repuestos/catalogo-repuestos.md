# Catálogo de repuestos de proveedor (ingesta automática) — xTechJS

Este documento añade una nueva capacidad al BC `inventory` ya existente: recibir,
de forma automatizada, el catálogo de precios de repuestos que genera una
aplicación externa propia (un vigilante de precios que rastrea periódicamente
varias tiendas especializadas de repuestos para móviles, tablets y consolas) y
guardarlo en un catálogo propio, consultable y filtrable por cualquier campo,
para poder decidir a qué proveedor comprar y generar pedidos de compra desde
ahí.

No sustituye nada de lo ya implementado en `inventory` (`Supplier`,
`InventoryItem`, `PurchaseOrder`, traspasos entre tiendas): añade una capa de
referencia de precios externa, independiente del stock propio, que se puede
vincular opcionalmente a un `InventoryItem` ya existente o usarse para crear
uno nuevo al decidir empezar a comprar ese repuesto.

## 1. Objetivo

- Que la aplicación externa de vigilancia de precios pueda enviar, de forma
  periódica y automática (sin intervención humana en xTechJS), los repuestos
  que encuentra en cada tienda especializada que rastrea: nombre, precio,
  disponibilidad, enlace a la ficha del producto y a qué proveedor pertenece.
- Que, si el proveedor (la tienda de origen) no existe todavía como
  `Supplier` en la base de datos, se cree automáticamente con los datos que
  envíe la aplicación externa, sin que el staff tenga que darlo de alta a
  mano antes.
- Que el staff pueda **buscar en ese catálogo por cualquier campo** (nombre
  del repuesto, proveedor, categoría, marca/modelo compatible, rango de
  precio, disponibilidad) desde el panel de administración, para comparar
  precios entre proveedores antes de generar un pedido de compra
  (`PurchaseOrder`, ya implementado).

## 2. Por qué es una entidad nueva y no `InventoryItem`

`InventoryItem` (ya implementado) representa un artículo que **xTechJS vende o
consume** en sus propias tiendas: tiene `salePriceCents`, `taxRate` y stock
real por tienda. El catálogo que envía la aplicación externa es otra cosa: es
una **referencia de lo que cuesta ese repuesto en cada proveedor externo en un
momento dado**, antes de decidir si se compra o no. Mezclarlo con
`InventoryItem` obligaría a crear un artículo de inventario propio por cada
repuesto visto en cualquier tienda rastreada, la mayoría de los cuales nunca
se llegarán a comprar. Por eso se modela como una entidad nueva,
`SupplierCatalogItem`, con un vínculo opcional a `InventoryItem` para cuando
el staff decide que sí lo va a gestionar como stock propio.

## 3. Modelo de dominio

### 3.1. Ampliación de `Supplier` (ya implementado)

`Supplier` ya existe (`name` único, `email`, `phone`, `notes`). Para poder
identificar de forma estable al mismo proveedor en sucesivos envíos (el
nombre tal y como aparece en la web de origen puede variar ligeramente),
se añade:

```ts
export interface Supplier {
  // ...campos ya existentes...
  externalRef: string | null; // identificador estable que usa la aplicación externa para este proveedor (p. ej. el dominio de la tienda)
  website: string | null;
}
```

**Actualización:** `Supplier` incorpora además identificación fiscal (NIF/
razón social), dirección estructurada y condiciones de pago, especificadas en
`20-gestion-proveedores/gestion-proveedores.md`. Cuando esta integración crea
un proveedor automáticamente, esos campos quedan vacíos porque la aplicación
externa no los conoce: el staff debe completarlos a mano desde la ficha del
proveedor antes de registrar su primera factura recibida. El contrato de
ingesta de este documento no cambia.

`externalRef` es único cuando no es `null` (constraint a nivel de base de
datos), y es el campo que se usa para decidir si un proveedor ya existe antes
de crear uno nuevo — nunca se compara por `name`, porque el nombre puede
cambiar de redacción entre envíos y el `name` actual ya es único por otros
motivos (altas manuales desde el panel).

### 3.2. Nueva entidad `SupplierCatalogItem`

```ts
export type CatalogItemAvailability = "in_stock" | "out_of_stock" | "unknown";

export interface SupplierCatalogItem {
  id: string;
  supplierId: string;
  externalRef: string;              // identificador estable del repuesto en la tienda de origen (URL, SKU del proveedor, etc.)
  name: string;
  category: string | null;          // p. ej. "pantalla", "batería", "conector de carga"
  brand: string | null;             // marca del dispositivo al que aplica (Apple, Samsung, Nintendo, Sony...)
  compatibleModels: string[];       // modelos compatibles, en texto libre (p. ej. ["iPhone 12", "iPhone 12 Pro"])
  sku: string | null;               // referencia/SKU del propio proveedor, si la expone
  priceCents: number;
  currency: string;                 // "EUR" por defecto
  availability: CatalogItemAvailability;
  url: string;                      // enlace a la ficha del producto en la tienda de origen
  capturedAt: Date;                 // cuándo se observó este precio/disponibilidad
  inventoryItemId: string | null;   // vínculo opcional a un InventoryItem propio ya gestionado
  createdAt: Date;
  updatedAt: Date;
}
```

- Unicidad por `(supplierId, externalRef)`: un envío posterior con el mismo
  par actualiza el registro existente (precio, disponibilidad, `capturedAt`,
  `url`, `name`) en vez de duplicarlo.
- `compatibleModels` se guarda como array (columna `jsonb` o tabla auxiliar,
  a decidir en implementación) para poder buscar por modelo sin depender de
  coincidencias exactas de texto libre.
- No se guarda histórico de precios en esta fase (cada envío sobrescribe el
  precio anterior del mismo repuesto); ver decisión abierta 7.3 si se quiere
  conservar evolución de precios más adelante.

## 4. Autenticación de la integración (máquina a máquina)

La aplicación externa no es un usuario humano del panel: no tiene email,
contraseña ni rol dentro de xTechJS, así que no debe autenticarse con el JWT
de `@xtaskjs/security` que usa el resto de la API (pensado para sesiones de
staff/cliente). Se añade un mecanismo de **clave de API** nuevo, específico
para integraciones externas, siguiendo el mismo criterio de seguridad que ya
se usa para los tokens de un solo uso (se guarda **hasheada**, nunca en
claro):

- Nueva entidad `IntegrationApiKey`: `id`, `name` (identifica qué aplicación
  externa es, p. ej. `"repuestos-watch"`), `keyHash` (hash de la clave,
  mismo mecanismo de comparación que ya usan los tokens de registro),
  `scope` (de momento un único valor posible: `"spare-parts-catalog:write"`),
  `active`, `createdAt`, `lastUsedAt`.
- La clave de API se genera **una sola vez** desde el panel de administración
  (sección nueva "Integraciones" dentro de Configuración, solo accesible con
  `inventory:manage`) y se muestra **una única vez** en pantalla al crearla,
  igual que una contraseña: después solo se guarda su hash, nunca el valor en
  claro.
- La aplicación externa la envía en cada petición en la cabecera
  `X-Api-Key: <clave>`. Un guard nuevo (independiente del
  `@Authenticated()` basado en JWT) valida la cabecera contra las claves
  activas antes de dejar pasar la petición al controlador de ingesta.
- Si la clave no es válida, está desactivada, o falta la cabecera, la API
  responde `401 Unauthorized` sin más detalle (no se debe indicar si la
  clave existe pero está desactivada, para no dar pistas a quien intente
  adivinarla).
- Permite revocar el acceso en cualquier momento marcando `active: false`,
  sin tener que coordinar un cambio de contraseña con la aplicación externa
  ni afectar a ningún usuario humano.

## 5. Endpoint y contrato para la aplicación externa

Esto es lo que hay que configurar en la aplicación de vigilancia de precios
para que pueda enviar los datos a xTechJS:

### 5.1. Endpoint

```
POST /api/integrations/spare-parts-catalog
```

- **Cabeceras:**
  - `Content-Type: application/json`
  - `X-Api-Key: <clave de API generada desde el panel de xTechJS>`
- **No requiere sesión de usuario ni JWT.**

### 5.2. Cuerpo de la petición

```json
{
  "supplier": {
    "externalRef": "tienda-ejemplo.es",
    "name": "Tienda Ejemplo Repuestos",
    "website": "https://www.tienda-ejemplo.es",
    "email": "ventas@tienda-ejemplo.es",
    "phone": "+34900000000"
  },
  "items": [
    {
      "externalRef": "tienda-ejemplo.es:PROD-12345",
      "name": "Pantalla completa iPhone 12 negra",
      "category": "pantalla",
      "brand": "Apple",
      "compatibleModels": ["iPhone 12", "iPhone 12 Pro"],
      "sku": "PROD-12345",
      "priceCents": 4590,
      "currency": "EUR",
      "availability": "in_stock",
      "url": "https://www.tienda-ejemplo.es/producto/PROD-12345",
      "capturedAt": "2026-10-03T10:15:00Z"
    }
  ]
}
```

**Campos de `supplier` (obligatorio en cada envío):**

| Campo         | Tipo   | Obligatorio | Notas |
|---------------|--------|-------------|-------|
| `externalRef` | string | Sí          | Identificador estable del proveedor para la aplicación externa (recomendado: el dominio de la tienda). Es la clave que decide si el proveedor ya existe. |
| `name`        | string | Sí          | Nombre del proveedor. Si el proveedor ya existe (por `externalRef`) y el nombre ha cambiado, se actualiza. |
| `website`     | string (URL) | No    | |
| `email`       | string (email) | No  | |
| `phone`       | string | No          | |

**Campos de cada elemento de `items`:**

| Campo              | Tipo                                         | Obligatorio | Notas |
|--------------------|-----------------------------------------------|-------------|-------|
| `externalRef`      | string                                        | Sí          | Identificador estable del repuesto dentro de ese proveedor (clave de upsert junto con el proveedor). |
| `name`             | string                                        | Sí          | Máximo 200 caracteres. |
| `category`         | string                                        | No          | |
| `brand`            | string                                        | No          | |
| `compatibleModels` | array de string                               | No          | Máximo 50 elementos. |
| `sku`              | string                                        | No          | |
| `priceCents`       | entero ≥ 0                                    | Sí          | Precio en céntimos, sin decimales (4590 = 45,90 €). |
| `currency`         | string (ISO 4217, 3 letras)                   | No (por defecto `"EUR"`) | |
| `availability`     | `"in_stock" \| "out_of_stock" \| "unknown"`   | No (por defecto `"unknown"`) | |
| `url`              | string (URL)                                  | Sí          | Enlace a la ficha del producto en la tienda de origen. |
| `capturedAt`       | string (fecha/hora ISO 8601, con zona)        | Sí          | Momento en que la aplicación externa observó ese precio. |

- Límite recomendado: **500 elementos por petición**. Para catálogos más
  grandes, la aplicación externa debe dividir el envío en varias peticiones
  (paginación propia del emisor, no hace falta que xTechJS la gestione).
- La petición es **idempotente**: reenviar el mismo `externalRef` de
  proveedor y de repuesto actualiza el registro existente en vez de
  duplicarlo, así que la aplicación externa puede reintentar un envío fallido
  sin riesgo.

### 5.3. Respuesta

```json
{
  "supplierId": "a3f1c2d4-...-uuid",
  "created": 12,
  "updated": 48,
  "skipped": 0,
  "errors": []
}
```

- `201 Created` si se ha creado el proveedor por primera vez, `200 OK` si ya
  existía.
- `created`/`updated`: número de repuestos nuevos/actualizados en este envío.
- `skipped`/`errors`: elementos del array `items` que no se han podido
  procesar (p. ej. `priceCents` negativo, `url` inválida), con el índice del
  elemento y el motivo, **sin rechazar el envío completo**: los elementos
  válidos del mismo lote se procesan igualmente.
- `400 Bad Request` solo si falta el bloque `supplier` o `items` no es un
  array válido (error de forma, no de contenido de un elemento concreto).
- `401 Unauthorized` si la clave de API es inválida, está desactivada o no se
  ha enviado.

## 6. Impacto en el dominio y la API existentes

- **`Supplier`**: añadir `externalRef` (único, nullable) y `website`.
- **Nueva entidad `SupplierCatalogItem`** y su tabla `inventory_supplier_catalog_items`,
  con índice único `(supplier_id, external_ref)` y columnas indexadas para
  búsqueda por `name`, `category`, `brand`, `availability` y rango de
  `price_cents`.
- **Nueva entidad `IntegrationApiKey`** y su tabla `integration_api_keys`.
- **Nuevo guard** de autenticación por cabecera `X-Api-Key`, independiente
  del `@Authenticated()` basado en JWT, aplicado solo al controlador de
  ingesta.
- **Nuevo controlador** `POST /api/integrations/spare-parts-catalog` (sección
  5), con su propio esquema Zod de validación.
- **Nuevos casos de uso/comandos CQRS**, siguiendo el patrón `@Service` +
  CQRS ya establecido: `UpsertSupplierFromIntegration` (crea o actualiza el
  `Supplier` por `externalRef`), `ImportSupplierCatalogItems` (hace el upsert
  por lotes de `SupplierCatalogItem`).
- **Nuevos endpoints de consulta para el panel** (protegidos con
  `@Authenticated()` + `PERMISSIONS.inventoryManage`, como el resto de
  `inventory`):
  - `GET /api/inventory/catalog?q=&supplierId=&category=&brand=&model=&availability=&priceMin=&priceMax=&pagina=&pageSize=`
    — listado filtrable por cualquier combinación de campos.
  - `GET /api/inventory/catalog/:id` — ficha de un repuesto del catálogo.
  - `POST /api/inventory/catalog/:id/link-inventory-item` — vincula el
    repuesto del catálogo a un `InventoryItem` propio ya existente.
  - `POST /api/inventory/catalog/:id/create-inventory-item` — crea un
    `InventoryItem` propio a partir de los datos del repuesto del catálogo
    (nombre, precio orientativo) y lo vincula automáticamente.
  - Gestión de claves de API (`GET/POST/PATCH /api/integrations/api-keys`,
    solo para administración desde el panel, con `inventory:manage`).

## 7. Frontend

- **Nueva sección "Catálogo de repuestos"** dentro de almacén, con listado
  separado de la ficha de detalle (regla de oro de `04-frontend/frontend.md`):
  filtros de texto libre, proveedor, categoría, marca, modelo compatible,
  rango de precio y disponibilidad, todos combinables y presentes en el
  listado (no solo en la ficha).
  - La búsqueda por texto libre cubre `name`, `sku`, `category`, `brand` y
    `compatibleModels` a la vez, para poder "buscar cualquier tipo de
    repuesto por cualquier campo" sin que el usuario tenga que saber en qué
    campo está el dato.
- **Ficha de detalle** del repuesto de catálogo: datos completos, enlace a la
  ficha original en la tienda del proveedor, fecha de la última captura de
  precio, y acciones "Vincular a artículo existente" / "Crear artículo de
  inventario" / "Añadir a un pedido de compra" (reutiliza el flujo ya
  implementado de `PurchaseOrder`, preseleccionando el proveedor y el precio
  observado como `unitCostCents` orientativo).
- **Nueva pantalla "Integraciones"** (dentro de Configuración, solo con
  `inventory:manage`): listado de claves de API activas, con nombre, fecha de
  creación y último uso; botón "Generar nueva clave" que la muestra una única
  vez; botón "Revocar".

## 8. Decisiones abiertas

1. **Histórico de precios**: esta fase sobrescribe el precio anterior en cada
   envío. Si se quiere poder ver la evolución de precios de un repuesto en un
   proveedor a lo largo del tiempo, haría falta una tabla adicional de
   histórico (`supplier_catalog_price_history`) que no se incluye en esta
   primera versión.
2. **Límite de antigüedad**: decidir si los repuestos cuyo `capturedAt` lleva
   mucho tiempo sin actualizarse (p. ej. más de 30 días) deben marcarse como
   "desactualizado" u ocultarse por defecto del listado, para no mostrar
   precios obsoletos como si fueran vigentes.
3. **Alcance de `compatibleModels`**: de momento es texto libre sin un
   catálogo cerrado de modelos de dispositivo; se podría normalizar más
   adelante contra el catálogo de marcas/modelos ya implementado para
   reparaciones (`1f4948f` en el histórico de commits), si se quiere
   garantizar coincidencias exactas al filtrar.
4. **Varias claves de API por integración**: esta fase asume una clave activa
   por aplicación externa; si en el futuro hay varios entornos (desarrollo/
   producción del vigilante de precios) o se quiere rotar claves sin cortar
   el servicio, se podría permitir más de una clave activa por `name`.

## 9. Petición para ChatGPT

1. Añadir `externalRef` y `website` a `Supplier` (migración incluida) y
   `UpsertSupplierFromIntegration` para crear/actualizar por `externalRef`.
2. Crear la entidad `SupplierCatalogItem` (sección 3.2), su migración, y
   `ImportSupplierCatalogItems` para el upsert por lotes por
   `(supplierId, externalRef)`.
3. Implementar `IntegrationApiKey` (sección 4): generación, hash, guard de
   validación por cabecera `X-Api-Key`, y los endpoints de gestión desde el
   panel.
4. Implementar `POST /api/integrations/spare-parts-catalog` exactamente con
   el contrato de la sección 5 (incluyendo el comportamiento de `errors`/
   `skipped` por elemento, sin rechazar el lote completo por un elemento
   inválido).
5. Implementar los endpoints de consulta y las acciones de vínculo/creación
   de `InventoryItem` y de alta de pedido de compra descritos en la
   sección 6.
6. Implementar el frontend descrito en la sección 7, reutilizando el patrón
   de listado/ficha separados y los componentes de filtro ya existentes en
   el resto de `inventory`.

## Estado de implementación (2026-10-03)

- `Supplier` incluye `externalRef` único cuando no es nulo y `website`. La
  entidad `SupplierCatalogItem` guarda precio/disponibilidad observados,
  modelos compatibles como JSONB y un vínculo opcional a `InventoryItem`. La
  migración `1741300000000-add-supplier-catalog-and-integration-keys.ts` crea
  tablas e índices sin modificar artículos o existencias actuales.
- `POST /api/integrations/spare-parts-catalog` autentica `X-Api-Key` hasheada,
  con scope `spare-parts-catalog:write` y respuesta 401 genérica. Admite lotes
  de hasta 500, upsert por referencia externa de proveedor y repuesto y errores
  por elemento sin rechazar los válidos. Importar catálogo no crea
  `InventoryItem` ni modifica `store_inventory_stock`.
- `/almacen/catalogo-repuestos` ofrece filtros combinables y paginación; la
  ficha permite abrir el origen, vincular un artículo, crear explícitamente un
  artículo interno con stock inicial cero en tiendas autorizadas y generar un
  pedido con el proveedor/precio observado. `/configuracion/integraciones`
  permite crear claves (mostradas una sola vez), listar su último uso y
  revocarlas.
- Migración aplicada a PostgreSQL local sin recrear volúmenes. Verificado con
  typechecks/builds API/web, 141 pruebas API y 90 web; contenedor API saludable.
- Se mantienen fuera de esta fase el histórico de precios y la clasificación
  automática de capturas antiguas; `compatibleModels` sigue siendo texto libre.
