# Alta de tienda (ficha de establecimiento) — xTechJS

Este documento revisa y amplía el alta de tienda ya implementada
(`Store`: `name`, `address`, `phone`, `taxId`, `invoiceSeriesPrefix`, `active`
en `apps/api/src/stores`), tomando como referencia los formularios de alta de
tienda habituales en el software de gestión multi-local y adaptándolo a lo
que exige/permite la normativa española, para un negocio con varios
establecimientos físicos. Complementa `15-multitienda/multitienda.md` (que ya
define el concepto de `Store` y su alcance sobre usuarios, reparaciones,
almacén y facturación): este documento se centra solo en **qué datos recoge
la ficha de cada tienda**.

## 1. Qué suele pedirse al dar de alta una tienda (resumen del análisis)

El alta de tienda en este tipo de software suele pedirse, en tres bloques:
**datos básicos** (nombre del negocio, nombre alternativo de la tienda,
email, logo), **contacto** (teléfono, web, dirección, código postal, ciudad,
provincia/estado, país) y **otros** (número de registro, horario de
apertura/cierre, zona horaria, formato de hora, idioma, moneda por defecto,
formato de precio, y un interruptor para sincronizar precios/inventario entre
tiendas).

## 2. Qué sobra para xTechJS

Buena parte de ese catálogo de campos está pensado para cadenas que operan en
varios países y monedas. Varios de esos campos no aportan nada a un negocio
español de una sola moneda y un solo país, y añadirlos sería complejidad sin
beneficio:

- **Zona horaria, formato de hora, idioma y moneda por defecto**: no aplican
  mientras el negocio opere solo en España (Europe/Madrid, español, EUR). Se
  dejan fuera; si algún día se abre una tienda fuera de España, se añadirían
  entonces, no antes.
- **Formato de precio** (separador decimal): fijo al formato español
  (coma decimal), no configurable por tienda.
- **Sincronizar inventario y precios entre tiendas**: ya resuelto de otra
  forma en `15-multitienda/multitienda.md` sección 5.1 (catálogo compartido,
  stock por tienda), no hace falta un interruptor nuevo.
- **"Nombre alternativo"**: innecesario como campo aparte, el `name` ya
  existente cumple esa función (nombre comercial de la tienda).

## 3. Qué falta para cumplir la normativa española

### 3.1. Identidad fiscal: una sola vez, no por tienda (salvo excepción)

Hoy cada PDF (factura, resguardo de depósito, informe técnico) usa una
identidad fiscal **global** fija por configuración
(`INVOICE_ISSUER_NAME`, `INVOICE_ISSUER_TAX_ID`, `INVOICE_ISSUER_ADDRESS` en
`apps/api/src/shared/infrastructure/config/app-config.ts`), y `Store` ya tiene
su propio `taxId` opcional. Esto puede ser un problema según cómo esté
montado el negocio:

- **Caso habitual en España**: todas las tiendas pertenecen a la **misma
  persona física o jurídica** (mismo autónomo o misma sociedad), con un único
  NIF/CIF. En ese caso, **todas las facturas deben llevar el mismo NIF y la
  misma razón social**, cambiando solo el domicilio del establecimiento y,
  como mucho, un código interno de tienda en la factura. El campo `taxId` de
  `Store` **no debería rellenarse por tienda** en este caso: debe heredar
  siempre `INVOICE_ISSUER_TAX_ID`/`INVOICE_ISSUER_NAME`, y el PDF debe añadir
  el domicilio concreto de la tienda emisora junto al domicilio fiscal
  general, no sustituirlo.
- **Caso menos habitual pero posible**: alguna tienda es una **sociedad
  distinta** (por ejemplo, un local franquiciado o una sociedad separada por
  motivos fiscales). Solo en ese caso tiene sentido que esa tienda concreta
  lleve su propio `taxId`/`legalName` y que las facturas de esa tienda usen
  esos datos en vez de los globales.
- **Qué se implementa**: `Store.taxId` pasa a ser explícitamente opcional
  como "excepción" (solo si esa tienda factura con un NIF distinto al
  general), y se añade `Store.legalName` (razón social) con el mismo
  criterio. Los generadores de PDF (`GetPaymentPdf`,
  `GetRepairReceipt`/`GetRepairTechnicalReport`,
  `GetEcommerceOrderInvoicePdf`) deben usar `store.taxId ?? INVOICE_ISSUER_TAX_ID`
  y `store.legalName ?? INVOICE_ISSUER_NAME`, mostrando siempre el domicilio
  de la tienda concreta (`store.address*`) como domicilio del establecimiento
  emisor.
- **Esto debe confirmarse con la gestoría/asesoría fiscal del negocio** antes
  de fijarlo en producción — este documento deja la lógica preparada para
  ambos casos, no decide cuál aplica (ver decisión abierta 5.1).

### 3.2. Dirección estructurada (no un único campo de texto)

`Store.address` pasa de un único campo de texto libre a estar estructurado
igual que ya se hace con los datos de facturación del cliente
(`CustomerBillingDetails` en `11-alta-clientes/registro-cliente.md`), por
consistencia y porque una dirección fiscal/postal completa necesita sus
partes por separado (código postal para rutas de envío del punto 5.5 de
`13-ecommerce-compraventa/ecommerce.md`, provincia para informes, etc.):

```ts
export interface Store {
  id: string;
  name: string;              // nombre comercial de la tienda (ya existe)
  legalName?: string | null; // razón social, solo si difiere de la emisora global (sección 3.1)
  taxId?: string | null;     // NIF/CIF, solo si difiere del global (sección 3.1) — ya existe, cambia su significado
  addressStreet: string;
  addressPostalCode: string;
  addressCity: string;
  addressProvince: string;
  addressCountry: string;    // "España" por defecto
  phone?: string | null;     // ya existe
  email?: string | null;     // nuevo, opcional
  openingHours?: string | null; // horario legado, conservado sin interpretar
  weeklyOpeningHours?: StoreDayOpeningHours[] | null; // horario semanal estructurado
  invoiceSeriesPrefix: string; // ya existe
  logoUrl?: string | null;   // nuevo, opcional
  active: boolean;           // ya existe
  createdAt: Date;
  updatedAt: Date;
}
```

Migración: añadir las columnas nuevas (todas nullable salvo las de dirección,
que requieren un valor por defecto para las tiendas ya existentes —
recomendado: volcar el `address` actual completo en `addressStreet` y dejar
el resto vacío, marcando esas tiendas para que el staff complete el resto a
mano una vez migrado).

### 3.3. VeriFactu y facturación electrónica (a confirmar según la fecha de implementación)

La normativa española de sistemas informáticos de facturación (Real Decreto
1007/2023, "VeriFactu") exige que cada sistema que emite facturas quede
identificado, con huella/encadenamiento de registros y código QR, y su
entrada en vigor es progresiva durante 2026-2027 según el tipo de obligado
tributario. Con varias tiendas emitiendo facturas en paralelo, hay que
confirmar en el momento de implementar si la normativa vigente entonces
exige un identificador de sistema de facturación distinto por establecimiento
o si basta con uno único para toda la empresa. Se deja preparado un campo
opcional:

```ts
veriFactuSystemId?: string | null; // identificador del sistema de facturación de esa tienda, si la normativa vigente lo exige por establecimiento
```

Este documento **no implementa** el encadenamiento de huellas ni el QR de
VeriFactu (es un desarrollo propio considerable, fuera del alcance de este
documento): solo deja el campo preparado para no tener que volver a migrar
`Store` cuando se aborde esa funcionalidad.

### 3.4. Documentación de cumplimiento del establecimiento (opcional)

Todo establecimiento físico de atención al público en España debe disponer
de **hojas de reclamaciones** y, según el municipio y la actividad, puede
necesitar **licencia de apertura/actividad**. Esto es una obligación física
del local, no algo que el software deba "cumplir" por sí mismo, pero puede
ser útil guardar constancia digital de esos documentos por tienda,
reutilizando el módulo `attachments` ya existente con un nuevo enlace
opcional `storeId` (siguiendo el mismo patrón ya usado para
`repairStepId`/`ecommerceProductId`/`tradeInRequestId`). Se marca como mejora
opcional, no bloqueante para el resto de este documento.

## 4. Frontend

Extender la pantalla de gestión de tiendas ya implementada
(`StoreManagement.vue`/formulario de alta) con los campos nuevos de la
sección 3.2 (dirección estructurada, email, horario, logo), manteniendo la
separación listado/ficha ya exigida por `04-frontend/frontend.md`. El campo
`taxId`/`legalName` se muestra como una sección claramente marcada como
"excepción: solo si esta tienda factura con datos fiscales distintos a los
generales del negocio", para que el staff no la rellene por error pensando
que es obligatoria.

### 4.1. Listado y ficha independientes

- `/admin/tiendas`: listado con busqueda, filtro activo/inactivo y acciones
  de alta, edicion y activacion. No contiene el formulario de alta.
- `/admin/tiendas/nueva` y `/admin/tiendas/:id/editar`: ficha propia con
  campos repartidos en tres columnas en escritorio, dos en tablet y una en
  movil. Identidad y direccion son bloques visibles; excepcion fiscal y
  VeriFactu son apartados opcionales plegables. El prefijo de serie no forma
  parte de la excepcion fiscal.

#### Horario semanal

La ficha permite marcar cada dia de lunes a domingo como abierto/cerrado y
configurar su apertura y cierre con campos de hora. Los dias cerrados tienen
las horas deshabilitadas. Se guarda un tramo por dia, en formato `HH:mm` de
24 horas; ambas horas son obligatorias en dias abiertos y el cierre debe ser
posterior a la apertura dentro del mismo dia. No incluye varios turnos ni
horarios que crucen medianoche.

`StoreDayOpeningHours` contiene `day` (`monday` a `sunday`), `open`, `opensAt`
y `closesAt`. La API exige los siete dias sin duplicados; en dias cerrados
las horas son `null`. Crear y editar usan `weeklyOpeningHours` y las mismas
validaciones en cliente y servidor.

La migracion `AddWeeklyOpeningHoursMigration1740800000000` agrega
`stores.weekly_opening_hours` como JSONB nullable. No interpreta ni borra el
texto antiguo `openingHours`. Si una tienda no tiene horario estructurado,
la ficha muestra el texto anterior y conserva ese estado al editar otros
datos; el horario semanal solo se establece al modificar sus controles.

### 4.2. Catalogo geografico seleccionable

Alcance confirmado: todos los paises/territorios del catalogo ISO, con nombres
en espanol; provincias, poblaciones y codigos postales de Espana. No se exige
ni se incluye cobertura postal internacional.

- Migracion `SeedAddressCatalogMigration1740700000000`: tablas
  `address_countries`, `address_provinces`, `address_postal_places` e
  instantanea local, sin descargas al arrancar. Incluye 250 entradas de paises
  y territorios, 52 provincias/ciudades autonomas y 37.867 combinaciones
  poblacion/codigo postal de GeoNames (CC BY, con atribucion).
- Seleccion encadenada: pais, provincia, poblacion (con busqueda) y codigo
  postal. Cambiar una seleccion limpia las dependientes. Una poblacion puede
  tener varios codigos postales; solo se autoselecciona si hay uno unico.
- Fuera de Espana, no se permite guardar una nueva direccion por seleccion
  mientras no exista catalogo postal del pais elegido. La via y el numero
  siguen siendo texto libre.
- El API valida la combinacion pais/provincia/poblacion/codigo postal al
  crear o modificar la direccion. Activar/desactivar una tienda historica no
  exige completar su direccion ni borra telefono o datos fiscales.
- GeoNames no garantiza exhaustividad ni exactitud y no sustituye una
  validacion oficial de Correos. Se conservan los datos historicos sin
  intentar inferir un codigo postal; las direcciones incompletas se marcan
  en el listado para completarlas expresamente.
- Procedencia, licencia y actualizacion del catalogo documentadas en
  `apps/api/src/stores/infrastructure/persistence/ADDRESS-CATALOG.md`.

## 5. Decisiones abiertas

1. **¿El NIF de facturación es único para todo el negocio, o alguna tienda es
   una sociedad fiscal distinta?** (sección 3.1) — confirmar con la
   gestoría antes de generar la primera factura multitienda en producción.
2. **¿VeriFactu exigirá un identificador de sistema de facturación por
   establecimiento?** (sección 3.3) — a confirmar según la normativa vigente
   en el momento de implementar la integración VeriFactu (fuera de alcance de
   este documento).
3. **¿Se guarda documentación de cumplimiento por tienda (licencia de
   apertura, hojas de reclamaciones) en el propio software?** (sección 3.4) —
   mejora opcional, no bloqueante.

## 6. Petición para ChatGPT

1. Extender `Store` y su migración con los campos de la sección 3.2
   (dirección estructurada, `legalName`, `email`, `openingHours`, `logoUrl`,
   `veriFactuSystemId`), sin romper el `StoreController` ya implementado más
   allá de actualizar su esquema de validación Zod.
2. Actualizar `GetPaymentPdf`, `GetRepairReceipt`/`GetRepairTechnicalReport` y
   `GetEcommerceOrderInvoicePdf` para que usen `store.taxId ?? INVOICE_ISSUER_TAX_ID`
   y `store.legalName ?? INVOICE_ISSUER_NAME` (sección 3.1), mostrando siempre
   el domicilio de la tienda concreta como domicilio del establecimiento.
3. Migrar las tiendas ya existentes volcando su `address` actual en
   `addressStreet` (sección 3.2), dejando el resto de campos de dirección
   vacíos para completarlos a mano.
4. Extender el formulario de alta/edición de tienda en el frontend con los
   campos nuevos, marcando `taxId`/`legalName` como excepción (sección 4).
5. Dejar `veriFactuSystemId` como campo opcional sin lógica asociada todavía
   (sección 3.3), documentado como pendiente de una integración futura.
