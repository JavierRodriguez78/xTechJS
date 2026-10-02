# Ficha de recepción de equipo (alta de orden de reparación) — xTechJS

Este documento mejora el **alta de orden de reparación** (`POST /api/repairs`,
caso de uso `CreateRepairOrder`), tomando como referencia el flujo de creación
de ticket de **RepairDesk** (software de gestión de talleres de reparación de
referencia en el sector), adaptado al alcance actual de xTechJS. No sustituye
nada de lo ya implementado: añade campos y pasos opcionales sobre el mismo
endpoint y la misma entidad `RepairOrder`.



## 1. Qué hace RepairDesk (resumen del análisis)

RepairDesk resuelve el alta de ticket **en una sola pantalla**, sin cambiar de
pestaña, en este orden:

1. **Cliente**: buscar por nombre/teléfono/email en la base de clientes
   existente, o darlo de alta sin salir de la pantalla ("walk-in" /
   autocheck-in).
2. **Dispositivo y avería**: seleccionar el modelo de dispositivo y una o
   varias averías de una lista configurable (o añadir una nueva avería sobre
   la marcha).
3. **Datos del equipo**: IMEI/número de serie, **PIN/contraseña de
   desbloqueo** del dispositivo (para que el técnico pueda acceder a él).
4. **Precio orientativo**: cada avería seleccionada trae un precio de un
   catálogo de servicios; se pueden añadir líneas sueltas ("Add Line Item").
5. **Accesorios entregados**: qué trae el cliente junto con el equipo
   (cargador, funda, tarjeta SIM/memoria...).
6. **Condición del equipo (pre-reparación)**: checklist de qué funciona y qué
   no antes de empezar (pantalla, batería, botones, golpes, daño por líquido),
   que después se repite al entregar el equipo (post-reparación) y se imprime
   en el justificante/factura.
7. **Técnico asignado** y fecha/hora estimada de entrega.
8. **Firma del cliente**, aceptando la condición declarada y los términos del
   depósito, antes de que empiece el trabajo.
9. **Guardar, imprimir el resguardo o generar factura** directamente desde la
   misma pantalla.

## 2. Qué tiene ya xTechJS y qué se añade

Hoy `CreateRepairOrder` ya cubre: cliente, tipo de dispositivo (validado
contra la configuración del admin), marca, modelo, número de serie, avería
reportada (texto libre) y accesorios entregados (texto libre). El resto del
flujo (asignar técnico, diagnóstico) se hace después, en un paso aparte
(`UpdateRepairTechnical`).

Se añade, sin romper lo anterior (todos los campos nuevos son opcionales):

### 2.1. `RepairOrder` — campos nuevos

```ts
export interface CreateRepairOrderInput {
  customerId: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber?: string;
  reportedIssue: string;
  deliveredAccessories?: string;
  // Nuevos, todos opcionales:
  devicePasscode?: string;          // PIN/patrón/contraseña de desbloqueo
  technicianId?: string;            // asignar técnico ya en el alta
  estimatedCompletionAt?: string;   // fecha/hora estimada de entrega (ISO)
  initialQuoteLines?: RepairQuoteLine[]; // ver 2.3
  preRepairCondition?: DeviceConditionChecklist; // ver 2.4
}
```

- Si se informa `technicianId`, reutilizar exactamente la misma validación ya
  existente en `UpdateRepairTechnical` (técnico activo y con rol
  `technician`), extrayéndola a una función compartida en vez de duplicarla.
- `estimatedCompletionAt` es solo informativo en esta fase (no dispara
  alertas ni SLA); se muestra al cliente en su portal y en el resguardo
  impreso.

### 2.2. PIN/contraseña del dispositivo — tratamiento de seguridad

`devicePasscode` es un dato especialmente sensible (da acceso físico al
dispositivo de un cliente):

- Se guarda **cifrado en reposo** (no en texto plano, y no como hash, porque
  el técnico necesita poder leerlo para desbloquear el equipo), con una clave
  de cifrado gestionada como el resto de secretos del proyecto (variable de
  entorno `DEVICE_PASSCODE_ENCRYPTION_KEY`, igual de exigente que las que ya
  exige `compose.production.yaml`).
- **Nunca** debe aparecer en el PDF de resguardo, en el informe técnico de
  `12-informe-tecnico-reparacion/informe-tecnico.md`, en el portal del
  cliente ni en ningún log — solo es visible para staff con permiso
  `repairs:manage` dentro de la ficha interna de la reparación, y de forma
  explícita (botón "mostrar PIN"), no en el listado.
- Es opcional: si el cliente no lo facilita (puede no querer darlo), el campo
  queda vacío y el ticket se crea igualmente.

### 2.3. Precio orientativo en el alta (reutilizando `RepairQuote`)

RepairDesk muestra un precio estimado ya en el alta porque tiene un catálogo
de servicios con precio por avería. xTechJS no tiene ese catálogo todavía (ver
decisión abierta 5.1), así que en vez de construirlo ahora, se reutiliza
directamente lo que **ya existe**: `RepairQuote`/`SaveRepairQuote`
(`03-backend` y código ya implementado). El alta de ticket permite,
opcionalmente, pasar `initialQuoteLines` (líneas sueltas introducidas a mano
por staff: descripción, cantidad, precio unitario) que `CreateRepairOrder`
reenvía a `SaveRepairQuote` con `status: "draft"` justo después de crear la
orden, en la misma transacción lógica (si falla el guardado del presupuesto,
la orden ya creada no se revierte, pero queda sin presupuesto inicial y se
puede añadir después desde la ficha, igual que hoy).

### 2.4. Checklist de condición del equipo (pre y post reparación)

```ts
export interface DeviceConditionChecklist {
  items: Array<{ label: string; ok: boolean }>; // p.ej. "Pantalla" / "Botones" / "Batería" / "Carcasa" / "Daño por líquido"
  notes?: string;
}

export interface RepairConditionRecord {
  id: string;
  repairOrderId: string;
  phase: "pre_repair" | "post_repair";
  checklist: DeviceConditionChecklist;
  recordedByUserId: string;
  createdAt: Date;
}
```

- Se guarda una fila `phase: "pre_repair"` en el alta (si se rellena el
  checklist) y otra `phase: "post_repair"` al marcar la reparación como lista
  para entregar — ambas inmutables (igual que `DataProtectionConsent`: no se
  sobrescriben, se añade una nueva si hace falta corregir algo).
- La lista de ítems del checklist (`"Pantalla"`, `"Botones"`, etc.) puede
  empezar como una lista fija razonable para electrónica de consumo
  (pantalla, botones físicos, batería, carcasa/golpes, puertos de carga,
  altavoz/micrófono, daño por líquido) y, si se quiere igualar a RepairDesk
  del todo, hacerse configurable por tipo de dispositivo desde
  `RepairWorkflowConfig` (mismo mecanismo ya usado para los tipos de
  dispositivo) — se deja como decisión abierta (5.2) para no sobredimensionar
  la primera versión.
- Las fotos de apoyo a la condición declarada (por ejemplo, una foto de un
  golpe ya existente) **no necesitan un nuevo enlace**: ya pueden adjuntarse
  usando `attachments` con el `repairOrderId` ya existente, tal como hoy.
- Ambos checklists (pre y post) se incluyen impresos en el resguardo/factura,
  igual que hace RepairDesk, para dejar constancia de qué daños existían ya
  antes de que el taller tocase el equipo.

### 2.5. Firma del cliente

```ts
export interface RepairOrderAcceptance {
  id: string;
  repairOrderId: string;
  acceptedTermsText: string;     // texto exacto de las condiciones de depósito
  acceptedTermsVersion: string;  // hash SHA-256 del texto, igual que DataProtectionConsent
  signatureImageAttachmentId: string; // la firma se guarda como un PNG vía `attachments`
  signedAt: Date;
  ipAddress: string | null;
}
```

- Mismo patrón que `DataProtectionConsent` (inmutable, solo `INSERT`, con
  versión del texto legal).
- La firma se captura con un componente de "pad" de firma táctil/ratón
  (canvas HTML, sin dependencias de pago: por ejemplo la librería
  `signature_pad`, ligera y sin coste de licencia) y se envía como imagen PNG,
  reutilizando el mismo mecanismo de subida de `attachments` ya implementado
  (sin necesidad de un enlace nuevo: puede guardarse con `repairOrderId`,
  igual que las fotos del equipo).
- El texto de condiciones de depósito (qué implica dejar el equipo, plazos,
  responsabilidad por piezas no retiradas, etc.) debe ser redactado/validado
  por alguien con competencia legal, igual que ya se advierte para el texto
  LOPD/RGPD en `11-alta-clientes/registro-cliente.md`; este documento solo
  aporta el mecanismo técnico para capturarlo y dejar constancia verificable.
- Recoger la firma es **opcional en esta fase** (algunos talleres físicos
  prefieren papel); si no se recoge, el ticket se crea igual, sin bloquear el
  alta.

### 2.6. Resguardo de depósito en PDF

Al guardar el ticket, staff puede generar e imprimir/enviar un **resguardo de
depósito** en PDF, reutilizando exactamente el mismo generador `pdfkit` que ya
usan `GetPaymentPdf` y el informe técnico de
`12-informe-tecnico-reparacion/informe-tecnico.md`. Contenido: datos del
cliente y del equipo, avería reportada, accesorios entregados, checklist de
condición pre-reparación, presupuesto inicial si lo hay, fecha estimada de
entrega, firma del cliente (si se capturó) — **nunca el PIN del
dispositivo** (ver 2.2). Mismo patrón de envío por email vía `@xtaskjs/mailer`
ya usado para facturas (`11-alta-clientes/registro-cliente.md` sección 5.1).

## 3. Frontend

Replicando la idea de "una sola pantalla" de RepairDesk, dentro de lo que ya
exige `04-frontend/frontend.md` (rutas separadas de listado/detalle): la
pantalla de alta (`/repairs/new`, ruta de creación, no un listado) debe reunir
en un único formulario, sin pestañas ni pasos separados, en este orden:
cliente (buscar o crear inline) → dispositivo y avería → PIN (opcional,
campo tipo contraseña con botón de mostrar/ocultar) → accesorios → presupuesto
inicial opcional (líneas sueltas) → checklist de condición → técnico y fecha
estimada → firma → guardar (con opción de imprimir/enviar el resguardo al
guardar). Esto no contradice la regla de oro del listado/ficha separados: es
una única pantalla de **creación**, no de listado.

### 3.1. Consola de recepción inspirada en TPV

La pantalla se organiza como una superficie operativa de dos paneles, inspirada
en la referencia visual aportada sin copiar su marca ni controles ajenos:

- **Izquierda:** búsqueda paginada de cliente por nombre, email o teléfono,
   selección del cliente activo y líneas del presupuesto inicial.
- **Derecha:** tarjetas para los tipos de reparación configurados, datos del
   equipo, recepción, checklist y acciones de `Ver tickets`, `Nuevo cliente`,
   `Cancelar` y `Crear ticket`.
- La búsqueda reutiliza `GET /api/customers?q=...&pageSize=...` y la acción de
   tickets reutiliza `GET /api/repairs?cliente=...`; no se crea un endpoint de
   recepción duplicado ni se omiten los permisos existentes.
- En móvil, los dos paneles se apilan y la barra de acciones conserva tamaños
   estables en dos columnas.

### 3.2. Catálogo encadenado de equipo

Al seleccionar un tipo de reparación, si administración ha configurado un
catálogo para ese tipo se abre un panel lateral en dos pasos: primero marca y
después modelo. Cada modelo puede tener una URL de imagen opcional, que se
muestra en su tarjeta. El administrador mantiene las entradas
`{ deviceType, brand, model, imageUrl? }` desde la configuración de tipos de
dispositivo. La API publica el catálogo en `GET /api/repairs/config` y valida
la combinación al crear la orden. Los tipos sin modelos configurados conservan
la introducción manual de marca y modelo para compatibilidad operativa. El
panel de marcas se abre siempre: cuando no existen entradas, los técnicos ven
la alternativa manual y los administradores un acceso directo para configurar
el catálogo.

## 4. Permisos

No se añaden roles ni permisos nuevos: el alta de ticket sigue siendo
`repairs:manage` (admin y técnico), como ya ocurre hoy. El PIN del
dispositivo requiere ese mismo permiso para visualizarse (ver 2.2), sin un
permiso separado en esta fase.

## 5. Decisiones abiertas

1. **Catálogo de servicios de reparación con precio por avería** (lo que en
   RepairDesk rellena el precio automáticamente al elegir la avería): no se
   construye en esta fase; el precio orientativo se sigue introduciendo a
   mano vía `initialQuoteLines` (sección 2.3). Construirlo implicaría un
   nuevo BC o extender `inventory`/`repairs` con una tabla de tarifas por
   tipo de dispositivo + avería, y se deja para una fase posterior si el
   negocio lo pide explícitamente.
2. **Checklist de condición configurable por tipo de dispositivo** vs. lista
   fija única: este documento especifica una lista fija razonable para
   arrancar (sección 2.4); hacerla configurable por el admin es una mejora
   incremental compatible, no bloqueante.
3. **Firma táctil obligatoria u opcional**: se especifica opcional para no
   bloquear el alta en talleres que todavía trabajen con papel; si el negocio
   quiere hacerla obligatoria, basta con añadir la misma validación que ya
   existe para forzar el diagnóstico obligatorio (`Store Settings` de
   RepairDesk tiene un equivalente a forzar campos; aquí bastaría un flag en
   `RepairWorkflowConfig`).

## 6. Petición para ChatGPT

1. Extender `CreateRepairOrderInput`/`RepairOrder` con los campos nuevos de la
   sección 2.1, todos opcionales, sin romper los tests existentes de
   `create-repair-order.test.ts`.
2. Implementar el cifrado en reposo de `devicePasscode` (sección 2.2) y su
   visibilidad restringida (nunca en PDFs, portal de cliente ni logs).
3. Enlazar `initialQuoteLines` con `SaveRepairQuote` ya existente (sección
   2.3), sin duplicar lógica de presupuestos.
4. Implementar `RepairConditionRecord` (pre y post reparación, sección 2.4) y
   su impresión en el resguardo/factura.
5. Implementar `RepairOrderAcceptance` (firma del cliente, sección 2.5),
   reutilizando `attachments` para guardar la imagen de la firma y el mismo
   patrón de consentimiento inmutable de `DataProtectionConsent`.
6. Implementar el resguardo de depósito en PDF (sección 2.6), reutilizando
   `pdfkit` y el envío por email ya existente.
7. Rediseñar la pantalla `/repairs/new` como un único formulario sin pasos
   separados, en el orden de la sección 3.
8. Añadir tests de API para el alta completa con todos los campos nuevos
   (PIN cifrado, presupuesto inicial, checklist, firma) y para el caso
   mínimo sin ninguno de ellos (debe seguir funcionando igual que hoy).
