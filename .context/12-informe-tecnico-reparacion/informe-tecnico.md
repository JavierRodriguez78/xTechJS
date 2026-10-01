# Pasos de reparación + informe técnico para el cliente — xTechJS

Este documento especifica una funcionalidad nueva sobre el módulo `repairs` ya
existente: un registro de **pasos de reparación** (bitácora técnica detallada, con
soporte fotográfico) y la generación de un **informe técnico en PDF** para el
cliente a partir de esos pasos. Incluye también una aclaración importante: la
segunda parte de la petición original (que los componentes usados se reflejen
automáticamente en la factura) **ya está implementada** — se documenta aquí solo
para que quede explícito y no se duplique.

## 1. Lo que ya existe y NO hay que volver a construir

**La facturación automática de materiales consumidos ya está hecha.** Cuando un
técnico consume stock de almacén contra una reparación (`ConsumeInventoryForRepair`,
en `inventory/application/consume-inventory-for-repair.ts`), ese movimiento ya
alimenta un `InvoiceDraft` (`payments/domain/invoice-draft.ts`,
`GetInvoiceDraft`) con una línea automática por cada movimiento de consumo
(`AutomaticInvoiceLine`: código, concepto, cantidad, precio, descuento, IVA). Este
borrador es la base de la factura final. **No hay que crear nada nuevo para esto.**

Lo único a valorar (opcional, fuera del alcance de esta petición si no se pide
explícitamente): hoy el `InvoiceDraft` solo recoge **materiales de almacén**. Si en
el informe técnico un paso de reparación describe mano de obra o un concepto
facturable que no pasa por almacén (por ejemplo, "revisión y limpieza - 30 min"),
ese concepto no entra automáticamente en el borrador de factura salvo que también
se registre como consumo de inventario (o se añada a mano en el presupuesto,
`SaveRepairQuote`, que es un flujo distinto y ya existente). Si se quiere que un
paso de reparación pueda marcarse como "facturable" y generar también una línea en
el `InvoiceDraft` sin pasar por almacén, es una extensión a decidir explícitamente
(ver sección 6).

## 2. Lo nuevo: pasos de reparación (`RepairStep`)

### Qué resuelve
Hoy el histórico de una reparación tiene dos niveles: el estado grueso
(`repair_status_events`: recibido → en diagnóstico → presupuestado → ... →
entregado) y el diagnóstico libre de `UpdateRepairTechnical` (un único campo de
texto). No existe una bitácora **paso a paso** de lo que el técnico ha ido haciendo
dentro de un mismo estado (por ejemplo, durante "en reparación": "desmontaje de
carcasa", "sustitución de condensador C12", "prueba de encendido"), cada uno con
sus propias fotos. Eso es lo que esta funcionalidad añade.

**Importante:** `RepairStep` es un concepto nuevo, **distinto** de
`repair_status_events` (que sigue existiendo tal cual, sin tocar) y distinto del
campo `diagnosis` de `UpdateRepairTechnical` (que también sigue existiendo). Los
tres conviven: estado grueso, diagnóstico general, y ahora una bitácora detallada
de pasos.

### Modelo de dominio (sigue en el bounded context `repairs`, no es un BC nuevo)

```typescript
// repairs/domain/repair-step.ts
export interface RepairStep {
  id: string;
  repairOrderId: string;
  sequence: number;            // orden de aparición en el informe, no necesariamente cronológico estricto
  title: string;                // "Sustitución de condensador C12"
  description: string | null;   // detalle largo, opcional
  technicianId: string;         // quién lo realizó
  performedAt: Date;            // cuándo se realizó (puede diferir de createdAt si se registra a posteriori)
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRepairStepInput {
  title: string;
  description?: string;
  performedAt?: Date;           // si no se indica, usar la fecha de creación
}

export interface UpdateRepairStepInput {
  title?: string;
  description?: string;
  performedAt?: Date;
}
```

### Casos de uso (mismo patrón `@Service` + CQRS ya consolidado en el resto del proyecto)
- `AddRepairStep` — crea un paso, calcula `sequence` como el siguiente disponible
  para esa reparación, usa el `technicianId` del usuario autenticado.
- `UpdateRepairStep` — edita título/descripción/fecha de un paso (solo admin o el
  propio técnico que lo creó, igual que ya se restringe la edición de otros
  recursos del módulo).
- `DeleteRepairStep` — borra un paso. Al borrar, sus adjuntos asociados (ver
  sección 3) deben eliminarse en cascada o quedar huérfanos de forma explícita;
  decidir y documentar, no dejarlo implícito.
- `ListRepairSteps` — lista los pasos de una reparación, ordenados por `sequence`.
- `GetRepairTechnicalReport` — nuevo caso de uso que agrega: datos de la orden,
  cliente, equipo, diagnóstico, todos los `RepairStep` con sus adjuntos
  (solo imágenes, ver sección 4), y genera el PDF.

### Persistencia
Nueva tabla `repair_steps`, con migración siguiendo la numeración incremental ya
usada en el proyecto (`173XXXXXXXXXX-add-repair-steps.ts`):
```sql
CREATE TABLE repair_steps (
  id UUID PRIMARY KEY,
  repair_order_id UUID NOT NULL REFERENCES repair_orders(id),
  sequence INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  technician_id UUID NOT NULL REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repair_order_id, sequence)
);
```

### Endpoints (staff)
- `POST /api/repairs/:id/steps` — permiso `repairs:manage`.
- `GET /api/repairs/:id/steps` — permiso `repairs:read`.
- `PATCH /api/repairs/:id/steps/:stepId` — permiso `repairs:manage`.
- `DELETE /api/repairs/:id/steps/:stepId` — permiso `repairs:manage`.
- `GET /api/repairs/:id/report` — genera y descarga el PDF (permiso `repairs:read`).

### Endpoints (portal cliente) — transparencia del proceso, no solo el informe final
Siguiendo el mismo patrón ya usado para adjuntos y chat del cliente
(`CustomerAttachmentController`, `CustomerChatController`): el cliente puede ver
los pasos de **sus propias** reparaciones, validando propiedad igual que el resto
del portal (email del usuario autenticado contra el CRM):
- `GET /api/customer/repairs/:id/steps` — solo lectura.
- `GET /api/customer/repairs/:id/report` — descarga su propio informe en PDF.

## 3. Soporte fotográfico — reutilizar `attachments`, no duplicar

El módulo `attachments` ya existe y ya soporta imágenes y vídeo
(`ALLOWED_ATTACHMENT_MIME_TYPES`), subida, descarga autenticada (staff y cliente) y
borrado. **No crear un sistema de adjuntos nuevo.** Extender el existente:

```typescript
// attachments/domain/repair-attachment.ts
export interface RepairAttachment {
  id: string;
  repairOrderId: string;
  repairStepId: string | null;   // NUEVO: null = adjunto general (comportamiento actual, sin romper nada)
  uploaderId: string;
  uploaderRole: AttachmentUploaderRole;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
}
```

Migración incremental: añadir columna `repair_step_id UUID NULL REFERENCES
repair_steps(id)` a `repair_attachments`. Al ser `NULL`-able y por defecto `NULL`,
los adjuntos ya existentes (subidos antes de esta funcionalidad) siguen
funcionando exactamente igual, como adjuntos generales de la reparación.

`UploadRepairAttachment` acepta un `repairStepId` opcional en el body; si se
indica, se valida que el paso pertenezca a la misma `repairOrderId` del adjunto.

## 4. Generación del informe técnico en PDF

### Reutilizar `pdfkit`, ya es dependencia del proyecto
`GetPaymentPdf` (`payments/application/get-payment-pdf.ts`) ya genera PDFs con
`pdfkit` para facturas/recibos. Usar exactamente la misma librería y el mismo
patrón (construir el `PDFDocument`, acumular chunks, resolver un `Buffer`) para
mantener consistencia — no introducir una segunda dependencia de generación de PDF.

### Contenido del informe
1. **Cabecera**: datos del emisor (reutilizar `INVOICE_ISSUER_NAME`,
   `INVOICE_ISSUER_TAX_ID`, `INVOICE_ISSUER_ADDRESS` de la config, ya usados en las
   facturas — consistencia visual con el resto de documentos oficiales).
2. **Datos de la reparación**: cliente, equipo (marca/modelo/tipo), avería
   reportada, fecha de recepción y de entrega (si existe), diagnóstico general
   (`UpdateRepairTechnical.diagnosis`).
3. **Pasos realizados**, en orden de `sequence`: título, descripción, fecha
   (`performedAt`), técnico responsable, y las imágenes de los adjuntos asociados a
   ese paso (`repairStepId` coincidente) insertadas inline con `pdfkit`
   (`document.image(buffer, { fit: [...] })`). **Los adjuntos de tipo vídeo no se
   insertan en el PDF** (pdfkit no soporta vídeo embebido) — se listan por nombre
   con una nota de que están disponibles en el portal del cliente.
4. **Materiales utilizados**: listar los `AutomaticInvoiceLine` del `InvoiceDraft`
   de esa reparación (reutilizar `GetInvoiceDraft`), como referencia informativa —
   no es la factura, es la trazabilidad de qué se ha sustituido.
5. Pie con fecha de generación del informe.

### Dónde se lee la imagen para insertarla
El `storageKey` de cada `RepairAttachment` se resuelve con el puerto ya existente
`AttachmentStorage.read(storageKey)` (`attachments/application/attachment-storage.ts`),
que devuelve un `Readable` — convertir a `Buffer` antes de pasarlo a
`document.image()`. Respetar el límite de tamaño ya configurado
(`ATTACHMENT_MAX_SIZE_BYTES`) y considerar redimensionar/comprimir si el informe
agrupa muchas fotos en alta resolución (a decidir según impacto real, no optimizar
sin medir primero).

## 5. Frontend

- Nueva pestaña o sección dentro de la vista de detalle de reparación
  (`RepairTechnicalTab.vue`, ya existe y ya tiene tests Vitest): listado de pasos
  con botón "Añadir paso", formulario con título/descripción/fecha, y subida de
  fotos directamente asociada al paso (reutilizar el componente de subida de
  adjuntos ya existente, pasándole `repairStepId`).
- Botón "Descargar informe técnico (PDF)" en la misma vista, y su equivalente en
  el portal de cliente (vista de detalle de su propia reparación).

## 6. Decisiones a tomar explícitamente (no asumir)

1. **¿Un paso puede ser "facturable" sin pasar por almacén?** Si la respuesta es
   sí, hay que extender `RepairStep` con un campo opcional (por ejemplo
   `billableConcept: { description: string; priceCents: number } | null`) y que
   `GetInvoiceDraft`/el borrador de factura también agregue estas líneas, no solo
   los movimientos de inventario. Si la respuesta es no (la mano de obra se sigue
   gestionando solo a través del presupuesto `SaveRepairQuote`), no tocar nada de
   facturación aquí.
2. **Visibilidad de los pasos para el cliente en tiempo real vs. solo en el informe
   final**: esta especificación asume que el cliente puede ver los pasos según se
   van añadiendo (transparencia del proceso), no solo al final. Si se prefiere que
   el cliente solo vea el informe cuando la reparación esté `repaired`/`delivered`,
   añadir esa restricción a `GET /api/customer/repairs/:id/steps`.
3. **Borrado de pasos con adjuntos asociados**: decidir cascada vs. bloqueo (igual
   que ya se decidió para otros borrados en el proyecto — revisar cómo se trató en
   `DeleteRepairAttachment` para mantener el mismo criterio).

## 7. Petición para ChatGPT

1. Crear `RepairStep` en el BC `repairs` (dominio, migración, repositorio
   PostgreSQL, casos de uso `@Service` + CQRS, controlador con guards) siguiendo
   exactamente el patrón ya consolidado en `repairs`/`customers`/`inventory`.
2. Extender `attachments` con `repairStepId` opcional (migración incremental,
   sin romper adjuntos existentes).
3. Implementar `GetRepairTechnicalReport` reutilizando `pdfkit` con el mismo
   patrón que `GetPaymentPdf`, endpoints staff y cliente para generarlo/descargarlo.
4. Frontend: sección de pasos en `RepairTechnicalTab.vue` + botón de descarga del
   informe, en ambos portales.
5. Antes de escribir código, resolver con el usuario los tres puntos de la
   sección 6 — especialmente el primero, porque cambia el alcance de la
   automatización de factura que ya existe.
6. Añadir tests (API con `node:test`, frontend con Vitest) para lo nuevo,
   manteniendo la disciplina de cobertura que ya tiene el resto del proyecto
   (53 tests API / 30 tests web a día de hoy — no se deben romper).
