# Gestión de clientes: datos, duplicación y verificación de email — xTechJS

Este documento revisa el modelo de datos del cliente (`Customer`) y los dos
flujos de alta que ya existen —`11-alta-clientes/registro-cliente.md` (alta
por staff + autorregistro por invitación) y `13-ecommerce-compraventa/ecommerce.md`
sección 1 (autorregistro público desde la tienda)— para resolver tres
problemas concretos detectados sobre lo ya implementado:

1. **Direcciones inconsistentes**: `Customer` tiene un campo `address` libre
   (una sola línea de texto) y, por separado, un grupo de campos de
   facturación estructurados (`billingName/billingTaxId/billingAddress/
   billingPostalCode/billingCity/billingProvince`) que no reutilizan el
   selector de provincia/ciudad/código postal ya construido para `Store`
   (`16-alta-tienda/alta-tienda.md`) y `User`/empleado
   (`17-gestion-empleados/gestion-empleados.md`).
2. **Duplicación de datos entre el alta por staff y el autorregistro**: cuando
   un miembro del staff ya ha dado de alta a un cliente con sus datos de
   contacto, el formulario de autorregistro (`POST /api/customers/register/:token`)
   vuelve a pedir **desde cero** nombre/NIF/dirección de facturación completos,
   como si el staff no hubiera introducido nada.
3. **Falta de verificación de email en el autorregistro público de la
   tienda**: el alta pública (`POST /api/shop/register`) activa la cuenta al
   instante, sin confirmar que el email introducido existe y pertenece a quien
   se está registrando — señalado como decisión abierta nº4 en
   `13-ecommerce-compraventa/ecommerce.md` y pendiente de resolver.

Se ha revisado como referencia el catálogo de campos habitual en los
formularios de alta de cliente del software de gestión de talleres de
reparación (nombre, apellidos, email, teléfono(s), dirección, identificación
fiscal, notas, etiquetas, contacto de emergencia, foto del cliente, campos
personalizados, etc.), para contrastarlo con lo que exige la legislación
española y evitar tanto defecto como exceso de recogida de datos. No se
reproduce aquí el catálogo completo de esa referencia ni se cita la fuente:
solo se incorporan, adaptados, los campos que tienen sentido en xTechJS y
encajan con el RGPD/LOPDGDD.

No sustituye nada de lo ya implementado (alta de cliente, consentimiento de
protección de datos, MailHog, tienda online): ajusta el modelo de datos y
añade los dos flujos que faltan.

## 1. Unificación de direcciones: reutilizar `AddressFields.vue`

Hoy `Customer` mezcla dos formas de guardar una dirección:

- `address: string | null` — una sola línea libre, pensada como dirección de
  contacto/entrega.
- `billingName/billingTaxId/billingAddress/billingPostalCode/billingCity/
  billingProvince` — grupo de campos de facturación, con `billingAddress`
  como texto libre (no estructurado en calle/número) y sin país.

Esto duplica el concepto de "dirección" con dos formatos distintos y obliga a
escribir el código de validación/autocompletado dos veces. Se propone:

- **Adoptar en `Customer` el mismo patrón de 5 campos ya usado en `Store`
  (`addressStreet/addressPostalCode/addressCity/addressProvince/
  addressCountry`) y en el empleado**, tanto para la dirección de contacto
  como para la de facturación, reutilizando el componente
  `apps/web/src/features/admin/views/AddressFields.vue` (selector de
  provincia → ciudad → código postal sobre el catálogo de 37.867 códigos
  postales españoles ya cargado) en ambos formularios (alta por staff,
  autorregistro, autoservicio desde la tienda).
- **Dirección de contacto** (`addressStreet/addressPostalCode/addressCity/
  addressProvince/addressCountry`): sustituye al actual `address` libre.
  Opcional en el alta por staff (igual que hoy).
- **Dirección de facturación**: se mantiene como grupo aparte porque puede no
  coincidir con la de contacto (empresas que facturan a una dirección fiscal
  distinta de la de entrega/contacto), pero pasa a usar la misma forma
  estructurada: `billingAddressStreet/billingAddressPostalCode/
  billingAddressCity/billingAddressProvince/billingAddressCountry`, más
  `billingName` y `billingTaxId` (sin cambios, ya correctos).
- **Casilla "Usar la misma dirección para facturación"**, marcada por
  defecto cuando ya existe una dirección de contacto: si está marcada, el
  formulario oculta los campos de facturación y el backend copia los valores
  de contacto al guardar; si se desmarca, se muestran los 5 campos de
  facturación con el mismo `AddressFields.vue`. Evita que la mayoría de
  clientes particulares (que facturan donde viven) tengan que rellenar la
  dirección dos veces.
- **Migración de datos**: los `Customer` existentes con `address` en texto
  libre no pueden mapearse automáticamente a campos estructurados sin
  intervención (no hay forma fiable de separar calle/CP/ciudad/provincia de
  una cadena libre). Se recomienda conservar `address` como campo heredado
  de solo lectura ("dirección antigua, sin estructurar") visible en la ficha
  del cliente hasta que alguien la actualice al nuevo formato, en vez de
  intentar un parseo automático.

## 2. Eliminar la duplicación de datos entre alta por staff y autorregistro

### 2.1. Situación actual

- `createCustomerSchema` (alta por staff, `POST /api/customers`) solo admite
  `displayName, email, phone, address, taxId, internalNotes, tags` — ni
  siquiera expone los campos de facturación que el propio `CreateCustomerInput`
  del dominio ya soporta.
- `completeRegistrationSchema` (autorregistro con token, `POST
  /api/customers/register/:token`) **exige siempre, sin excepción**:
  `password, billingName, billingTaxId, billingAddress, billingPostalCode,
  billingCity, billingProvince, consentAccepted, consentText`.

Resultado: si el staff ya conoce y ha introducido el NIF y la dirección de
facturación del cliente (por ejemplo, porque lo ha apuntado a mano o lo tiene
de una reparación anterior en papel), el cliente tiene que volver a
escribirlo todo igualmente al completar su registro, porque el formulario no
sabe qué ha rellenado ya el staff.

### 2.2. Cambio propuesto

- **Exponer los campos de facturación (y la dirección de contacto
  estructurada) en `createCustomerSchema`**, todos opcionales, para que el
  staff pueda precargarlos en el momento del alta si los conoce:
  `billingName?, billingTaxId?, billingAddressStreet?,
  billingAddressPostalCode?, billingAddressCity?, billingAddressProvince?,
  billingAddressCountry?, addressStreet?, addressPostalCode?, addressCity?,
  addressProvince?, addressCountry?`.
- **`GET /api/customers/register/:token` devuelve también los campos ya
  rellenados** (no solo `customerId` y `email` como hoy), para que el
  formulario de autorregistro pueda:
  - **Ocultar** cualquier campo que el staff ya haya completado con un valor
    válido (no vacío), mostrando su valor en modo lectura con una opción
    "Editar" por si el dato es incorrecto o ha cambiado.
  - **Pedir solo** lo que falta: en el caso límite de que el staff lo haya
    rellenado todo, el formulario de autorregistro se reduce a contraseña +
    aceptación del consentimiento.
- **`completeRegistrationSchema` pasa a tener todos los campos de
  facturación como opcionales**, excepto `password`, `consentAccepted` y
  `consentText` (estos tres nunca los puede rellenar el staff en nombre del
  cliente: la contraseña es personal y el consentimiento debe prestarlo el
  propio titular de los datos). El backend valida, al completar el registro,
  que entre lo ya guardado por staff y lo recibido ahora, los campos de
  facturación obligatorios para poder facturar (`billingName`, `billingTaxId`,
  dirección de facturación completa) **existan en conjunto**, sin exigir que
  lleguen todos en esta misma petición.
- Mismo criterio para el **autorregistro público desde la tienda**
  (`POST /api/shop/register`, sección 3): como ahí no hay alta previa por
  staff, se pide lo mínimo en el alta (sección 3.1) y el resto de datos de
  facturación se puede completar más adelante, antes del primer checkout
  (ya contemplado como recomendación en `13-ecommerce-compraventa/ecommerce.md`
  sección 1, aquí se confirma como criterio definitivo en vez de opción
  abierta).

## 3. Verificación de email en el autorregistro público de la tienda

Resuelve la decisión abierta nº4 de `13-ecommerce-compraventa/ecommerce.md`:
**se exige verificación de email antes de poder completar el resto de datos**,
en vez de activar la cuenta al instante.

### 3.1. Flujo en tres pasos

1. **`POST /api/shop/register/request`** (público, sin sesión): el visitante
   solo introduce **email**. El backend:
   - Comprueba que no exista ya un `Customer` con ese email (si existe, responde
     de forma genérica — "si el email existe, se ha enviado un correo" — para
     no filtrar qué emails están registrados).
   - Genera un **token de verificación de un solo uso, con caducidad corta**
     (recomendado 30 minutos, más corto que el token de invitación por staff
     porque aquí el usuario está esperando activamente), hasheado en base de
     datos igual que el resto de tokens del sistema.
   - Envía un email (vía `@xtaskjs/mailer`/MailHog) con un enlace
     `https://<dominio-web>/shop/register/verify?token=<token>`.
   - **No se crea todavía ningún `Customer` ni `User`**: hasta que el email no
     se verifica, no hay ningún registro en base de datos asociado a ese
     intento, salvo el propio token pendiente.
2. **`GET /api/shop/register/verify/:token`** (público): valida el token
   (existe, no caducado, no usado) y, si es válido, lo marca como verificado
   (sin consumirlo todavía) y devuelve el email asociado para precargar el
   siguiente formulario.
3. **`POST /api/shop/register/verify/:token`** (público): con el token ya
   verificado, el visitante completa el resto de datos — contraseña,
   nombre/razón social, teléfono (opcional), aceptación de la autorización
   LOPD/RGPD (mismo mecanismo de `DataProtectionConsent` que el resto del
   sistema). Aquí es cuando el backend:
   - Crea el `Customer` (`registrationStatus: "completed"`,
     `acquisitionChannel: "self_service"`) y el `User` asociado, en una única
     transacción, igual que hace hoy `RegisterShopCustomer`.
   - Consume el token de verificación (un solo uso).
   - Guarda la evidencia del consentimiento.

### 3.2. Por qué no verificar sobre un `Customer` ya creado

Crear el `Customer`/`User` en el paso 1 y verificar después (como se hace en
el flujo de invitación por staff, donde el cliente sí existe ya desde el
alta) obligaría a tener cuentas "fantasma" sin contraseña ni datos reales
cada vez que alguien escribe un email por error o abandona el registro a
medias, y complicaría la búsqueda por email para no duplicar clientes. Al no
crear nada hasta el paso 3, un intento abandonado no deja rastro en
`customers`/`users`, solo un token caducable sin más efecto.

### 3.3. Reutilización de infraestructura existente

- Mismo mecanismo de token hasheado + caducidad + un solo uso que
  `CustomerRegistrationToken` (sección 3 de `11-alta-clientes/registro-cliente.md`):
  se puede añadir un campo `purpose: "staff_invitation" | "shop_verification"`
  a una tabla de tokens compartida, o crear una tabla específica
  `ShopRegistrationVerificationToken` si se prefiere mantener los dos flujos
  completamente separados.
  Ninguna de las dos opciones bloquea la implementación; se deja como
  decisión de diseño para quien implemente.
- Mismo `@xtaskjs/mailer` + MailHog ya configurado.
- Mismo `DataProtectionConsentEntitySchema` y misma política de contraseñas
  (mínimo 12 caracteres) ya usada en `RegisterShopCustomer`.

## 4. Revisión del catálogo de campos frente a la legislación española

Comparando lo que suele pedirse en el alta de un cliente de taller con lo
que exige/permite la normativa española (RGPD, LOPDGDD, Reglamento de
facturación RD 1619/2012), se ajusta así:

- **Se mantiene**: nombre para mostrar (`displayName`), email, teléfono,
  dirección (ahora estructurada, sección 1), identificación fiscal (DNI/NIE/
  CIF, campo `taxId`/`billingTaxId`), notas internas, etiquetas.
- **Se añade `customerType: "individual" | "business"` (opcional)**: permite
  distinguir cuándo la factura debe emitirse a nombre de una persona física
  (DNI/NIE) o de una empresa (CIF + razón social), sin añadir más campos que
  los ya existentes (`billingName` ya cubre tanto el nombre de una persona
  como una razón social).
- **No se incorpora** separar `displayName` en nombre y apellidos: no aporta
  valor legal ni funcional aquí (el nombre completo ya sirve para factura y
  trato), y complicaría formularios y búsquedas sin necesidad.
- **No se incorpora** número de carné de conducir ni ningún otro documento
  de identidad adicional al DNI/NIE/CIF: no hay base legal ni finalidad para
  pedirlo en un taller de reparación.
- **No se incorpora** contacto de emergencia: no aplica al tipo de negocio
  (no es un servicio con riesgo para la persona del cliente) y sería
  recogida de datos de un tercero sin finalidad ni consentimiento propio.
- **No se incorpora** foto del cliente: dato biométrico/de imagen sin
  finalidad justificada para la gestión de reparaciones; distinto de las
  fotos del propio equipo (que ya se contemplan en
  `12-informe-tecnico-reparacion/informe-tecnico.md` y
  `14-alta-reparacion/alta-reparacion.md`).
- **No se incorpora** múltiples emails/teléfonos con marcado de "principal":
  añade complejidad sin que exista hoy un caso de uso que lo requiera (un
  email y un teléfono son suficientes para contacto y facturación). Puede
  reconsiderarse si en el futuro se necesita, por ejemplo, un contacto de
  facturación distinto del de contacto operativo.
- **No se incorpora** un sistema de campos personalizados configurables
  (custom fields) de alcance general: fuera del alcance de esta fase: puede
  cubrirse igual de bien, a menor coste, con el campo `internalNotes` y las
  `tags` ya existentes.
- **Factura simplificada vs. completa (RD 1619/2012)**: para compras de
  importe reducido no es obligatorio identificar al destinatario (factura
  simplificada); la identificación fiscal completa solo es obligatoria para
  factura completa o cuando el cliente la solicita. El modelo de datos aquí
  descrito soporta ambos casos porque los campos de facturación son
  opcionales hasta que se necesiten (el checkout/TPV debe decidir qué tipo
  de factura emitir según el importe y si el cliente ha aportado NIF).

## 5. Impacto en el dominio y la API existentes

- **`Customer`**: sustituir `address` por los 5 campos de contacto
  estructurados (manteniendo `address` como campo heredado de solo lectura,
  sección 1); renombrar `billingAddress/billingPostalCode/billingCity/
  billingProvince` a `billingAddressStreet/billingAddressPostalCode/
  billingAddressCity/billingAddressProvince` y añadir
  `billingAddressCountry`; añadir `customerType?: "individual" | "business"`.
- **`createCustomerSchema`**: añadir los campos opcionales de contacto y
  facturación estructurados (sección 2.2).
- **`completeRegistrationSchema`**: todos los campos de facturación pasan a
  opcionales salvo `password`, `consentAccepted`, `consentText` (sección 2.2);
  validación de "suficiencia conjunta" de datos de facturación en el backend.
- **`GET /api/customers/register/:token`**: devolver también los campos ya
  rellenados por staff, no solo `customerId`/`email`.
- **Nuevos endpoints públicos**: `POST /api/shop/register/request`,
  `GET /api/shop/register/verify/:token`, `POST
  /api/shop/register/verify/:token`, sustituyendo al actual
  `POST /api/shop/register` de un solo paso (`RegisterShopCustomer` pasa a
  ejecutarse solo en el tercer paso, tras verificar el email).
- **Nueva entidad de token de verificación** para el flujo de tienda (sección
  3.3), reutilizando el patrón de `CustomerRegistrationTokenEntitySchema`.
- **Frontend**: `AddressFields.vue` se reutiliza en el formulario de alta de
  cliente por staff, en `/customer/register` (autorregistro con invitación) y
  en `/shop/register` (ahora en tres pantallas: email → verificación →
  resto de datos); checkbox "usar la misma dirección para facturación"
  (sección 1) en los tres formularios donde aplique.

## 6. Decisiones abiertas

1. **Tabla de tokens compartida o separada** entre invitación por staff y
   verificación de email de tienda (sección 3.3): no bloquea el desarrollo,
   cualquiera de las dos opciones es válida.
2. **Migración del campo `address` heredado** (sección 1): decidir si se
   ofrece alguna ayuda semi-automática (por ejemplo, autocompletar provincia/
   ciudad a partir de un código postal si aparece en el texto libre) o se
   deja enteramente manual.
3. **Caducidad del token de verificación de email** (sección 3.1): se
   recomienda 30 minutos; ajustar según la fricción real observada.
4. **Alcance de `customerType`**: por ahora es solo informativo/orientativo
   para decidir el tipo de factura; no cambia ninguna validación obligatoria
   en esta fase.

## 7. Petición para ChatGPT

1. Unificar el modelo de direcciones de `Customer` según la sección 1:
   sustituir `address` por los campos de contacto estructurados (conservando
   `address` como campo heredado de solo lectura) y renombrar/completar los
   campos de facturación, reutilizando `AddressFields.vue` en los tres
   formularios afectados.
2. Exponer los campos de contacto/facturación en `createCustomerSchema` y
   hacer que `GET /api/customers/register/:token` devuelva lo ya rellenado,
   según la sección 2.2.
3. Relajar `completeRegistrationSchema` para que solo `password`,
   `consentAccepted` y `consentText` sean obligatorios, añadiendo en el
   backend la validación de "suficiencia conjunta" de datos de facturación
   antes de marcar `registrationStatus: "completed"`.
4. Sustituir el actual `POST /api/shop/register` de un solo paso por el
   flujo de tres pasos de la sección 3 (`request` → `verify` (GET) →
   `verify` (POST)), sin crear `Customer`/`User` hasta el tercer paso.
5. Actualizar el frontend: checkbox "usar la misma dirección para
   facturación" en los formularios de alta/autorregistro/tienda, y las tres
   pantallas nuevas de `/shop/register`.
6. Revisar y, si procede, escribir una migración de datos para los
   `Customer` existentes con campos de facturación en el formato antiguo
   (`billingAddress` como texto libre) hacia los nuevos campos
   estructurados, documentando qué ocurre con los que no puedan mapearse
   automáticamente.

## Estado de implementación (2026-10-03)

- `Customer` conserva `address` como dirección heredada de solo lectura y añade
  dirección de contacto estructurada, dirección fiscal estructurada y
  `customerType`. La migración `1741200000000` renombra la dirección fiscal
  antigua a calle y preserva literalmente su contenido; renombra los campos
  postales que ya estaban estructurados. No intenta separar una cadena libre ni
  inventa país para datos históricos, por lo que `billingAddressCountry` queda
  vacío hasta que se complete.
- El alta/edición CRM acepta los campos estructurados y permite copiar contacto
  a facturación. `GET /api/customers/register/:token` entrega los valores
  precargados; completar el registro combina esos valores con los editados y
  exige que la ficha resultante tenga los datos fiscales necesarios. El
  formulario muestra los campos precargados como solo lectura con edición
  explícita.
- El autorregistro público solicita el email, valida el enlace en un paso
  separado y no crea `Customer`/`User` hasta el envío final. Usa tokens hashados
  con caducidad de 30 minutos; el consumo del token, cliente, usuario y
  consentimiento ocurre en una transacción. El checkout también permite guardar
  datos fiscales faltantes y reutilizar la dirección de contacto.
- `AddressFields.vue` se comparte entre CRM, invitación, autorregistro y
  checkout. Las páginas públicas consumen el catálogo postal de solo lectura de
  `/api/shop/address-catalog/*`; las rutas internas conservan sus permisos.
- Pendiente: revisión legal del texto exacto de consentimiento. No se hace
  parseo automático de direcciones heredadas ni se completa un país sin dato
  fiable.
