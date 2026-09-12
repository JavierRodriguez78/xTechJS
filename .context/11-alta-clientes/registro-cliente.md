# Alta y autorregistro de clientes — xTechJS

Este documento define el flujo completo de alta de un cliente nuevo, desde que el
técnico/admin lo crea en el CRM hasta que el propio cliente completa su registro,
fija su contraseña y firma la autorización de protección de datos. Complementa
`02-modulos-funcionales/modulos.md` (sección CRM) y no sustituye lo ya implementado
(alta, listado, ficha, edición e historial de reparaciones), solo añade el paso de
autorregistro que faltaba.

## 1. Objetivo

Hoy el alta de cliente (`POST /api/customers`) la hace un miembro del staff con los
datos mínimos de contacto. Se necesita que, a partir de ese alta, **el propio
cliente complete sus datos de facturación, fije su contraseña de acceso al portal
`/customer`, y acepte la autorización de tratamiento de datos exigida por la
normativa española (LOPD-GDD, Ley Orgánica 3/2018, en aplicación del RGPD)**, sin
que el staff tenga que capitular esos datos por él.

## 2. Flujo funcional

1. **Alta por staff.** Un admin o técnico da de alta un cliente desde el CRM
   (`POST /api/customers`). **El campo `email` pasa a ser obligatorio** (hoy es
   opcional) — es la única vía de contacto para completar el registro. El resto de
   campos actuales (nombre, teléfono, dirección, notas) se mantienen como están.
2. **Estado inicial del cliente.** El cliente se crea con un nuevo estado
   `registrationStatus: "pending"` (frente a `"completed"` una vez termine el
   proceso). Mientras esté `pending`, el cliente **no tiene contraseña** y no puede
   iniciar sesión en `/customer`.
3. **Envío del email de invitación.** Al crear el cliente, el backend genera un
   **token de registro de un solo uso, con caducidad** (recomendado: 72h) y envía un
   email (vía `@xtaskjs/mailer`) con un enlace del tipo:
   `https://<dominio-web>/customer/register?token=<token>`
   El token se almacena hasheado en base de datos (igual que se hace con las
   contraseñas), nunca en claro, para que una fuga de la tabla no permita
   suplantar el registro.
4. **Formulario de autorregistro** (`/customer/register?token=...`), accesible sin
   sesión previa, solicita:
   - Contraseña (y confirmación), con la misma política de robustez que ya aplica
     `AuthenticationService` para el resto de usuarios.
   - Datos de facturación necesarios para poder emitir una factura fiscal más
     adelante: nombre/razón social, NIF/DNI/CIF, dirección fiscal completa
     (calle, número, código postal, población, provincia), y si aplica, datos de
     empresa (razón social distinta del nombre de contacto).
   - **Casilla de aceptación de la autorización de protección de datos** (ver
     sección 4), no premarcada, obligatoria para poder enviar el formulario.
5. **Confirmación del registro.** Al enviar el formulario:
   - El backend valida el token (existe, no caducado, no usado ya).
   - Guarda la contraseña con el mismo hash bcrypt que usa el resto del sistema.
   - Guarda los datos de facturación en el propio registro del cliente.
   - Registra la aceptación de la autorización: qué texto exacto se aceptó (o su
     versión/hash), fecha y hora, e IP de origen — ver sección 4.
   - Marca `registrationStatus: "completed"` e invalida el token (de un solo uso).
   - El cliente puede iniciar sesión inmediatamente después en
     `POST /api/auth/customer/login`, reutilizando el flujo ya existente.
6. **Reenvío y expiración.** Si el token caduca antes de que el cliente complete el
   registro, debe existir una vía para que el staff reenvíe la invitación
   (nuevo token, nuevo email), sin tener que borrar y recrear el cliente.

## 3. Impacto en el dominio y la API existentes

- **`Customer` (entidad/agregado):** añadir `email` como obligatorio (si hoy es
  opcional, hay que decidir una migración de datos para los clientes ya existentes
  sin email antes de aplicar el `NOT NULL`), y añadir `registrationStatus`
  (`pending` | `completed`), datos de facturación (pueden vivir en el propio
  agregado `Customer` o en un value object `BillingDetails` aparte, más alineado
  con el enfoque de `@xtaskjs/value-objects` que ya se usa en el proyecto).
- **Nueva entidad `CustomerRegistrationToken`** (o tabla equivalente): token
  hasheado, `customerId`, fecha de expiración, fecha de uso (null si no se ha
  usado). Vida corta, no forma parte del histórico de negocio.
- **Nueva entidad/tabla `DataProtectionConsent`** (ver sección 4): un registro por
  aceptación, no se sobrescribe nunca.
- **Nuevos endpoints:**
  - `GET /api/customers/register/:token` — valida el token y devuelve el email
    (o datos mínimos) asociado, para precargar el formulario. No requiere sesión.
  - `POST /api/customers/register/:token` — completa el registro (contraseña +
    datos de facturación + aceptación del consentimiento). No requiere sesión.
  - `POST /api/customers/:id/resend-invitation` — reenvía la invitación (protegido,
    solo staff con permiso `customers:manage`).
- **Casos de uso/comandos CQRS nuevos**, siguiendo el patrón ya establecido en el
  proyecto (`@Service` + `@CommandHandler`/`@QueryHandler` + controlador con
  guards): `CreateCustomer` pasa a disparar el envío de la invitación tras crear el
  cliente; `CompleteCustomerRegistration`, `ResendCustomerInvitation` como nuevos
  comandos.

## 4. Autorización de protección de datos (LOPD-GDD / RGPD)

Requisitos mínimos a cumplir, sin que esto sustituya el asesoramiento legal
específico del negocio:

- El consentimiento debe ser **expreso, informado y verificable**: casilla sin
  marcar por defecto, con un texto claro (no oculto en condiciones generales) que
  explique qué datos se tratan, con qué finalidad (gestión de la reparación,
  facturación, comunicación sobre el estado del equipo) y durante cuánto tiempo.
- Debe **guardarse evidencia de la aceptación**: versión del texto legal aceptado
  (o su hash), fecha/hora, e IP. Si el texto legal cambia en el futuro, las
  aceptaciones antiguas deben seguir siendo consultables tal y como se aceptaron
  (no sobrescribir, solo añadir nuevas versiones).
- El cliente debe poder **ejercer sus derechos ARCO-POL** (acceso, rectificación,
  cancelación/supresión, oposición, portabilidad, limitación) — no es objeto de
  esta fase implementarlo todo, pero el modelo de datos no debe impedirlo a
  futuro (evitar borrados físicos irreversibles sin registro, por ejemplo).
- El texto legal exacto (política de privacidad / cláusula de tratamiento de
  datos) debe ser redactado o validado por una persona con competencia legal antes
  de publicarse; este documento no proporciona ese texto, solo el mecanismo
  técnico para capturarlo y registrarlo.

## 5. Infraestructura: MailHog para pruebas de email

Para poder verificar en local y en Docker que los correos de invitación (y
cualquier otro email transaccional futuro: recuperación de contraseña,
notificaciones de estado de reparación) se generan y envían correctamente **sin
enviar correos reales**, se añade **MailHog** como servicio nuevo en
`compose.yaml`, junto al resto de infraestructura (`postgres`, `redis`).

MailHog actúa como servidor SMTP de pruebas: captura cualquier correo enviado por
la API y lo expone en una interfaz web donde se puede leer el email completo
(incluido el link de registro) sin que salga nunca a un servidor SMTP real.

### Cambios en `compose.yaml`

Añadir el servicio `mailhog`:

```yaml
  mailhog:
    image: mailhog/mailhog:v1.0.1
    ports:
      - "${MAILHOG_SMTP_PORT:-1025}:1025"   # puerto SMTP que usa la API para enviar
      - "${MAILHOG_UI_PORT:-8025}:8025"     # interfaz web para leer los correos
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8025/"]
      interval: 10s
      timeout: 5s
      retries: 5
```

Y añadir `mailhog` a los `depends_on: condition: service_healthy` del servicio
`api`, igual que ya ocurre con `postgres` y `redis`, para que la API no arranque
antes de que MailHog esté listo para recibir conexiones SMTP.

### Variables de entorno nuevas para la API

```yaml
  api:
    environment:
      # ...las ya existentes...
      SMTP_HOST: mailhog
      SMTP_PORT: 1025
      SMTP_SECURE: "false"
      MAIL_FROM: "no-reply@xtechjs.local"
```

En local (fuera de Docker, con `make dev`), estas mismas variables deben apuntar a
`localhost:1025` si se levanta MailHog con `make db-up` (o un objetivo nuevo del
Makefile, `make mail-up`) en paralelo a Postgres/Redis.

### Uso durante el desarrollo

- Interfaz web de MailHog: `http://localhost:8025` — ahí se ve cada email de
  invitación enviado por la API, con el link de registro completo, sin necesidad de
  credenciales de un proveedor de correo real.
- No requiere volumen persistente: los correos capturados son solo para pruebas y
  se pierden al reiniciar el contenedor, lo cual es deseable en este caso.

## 6. Frontend

- Nueva ruta pública `/customer/register?token=...` (fuera del login de
  `/customer` existente), con el formulario descrito en el punto 2.
- Vista de error clara para token inválido, caducado o ya usado, con la opción de
  solicitar al staff (o a sí mismo, si se decide permitir autoservicio) un
  reenvío.
- En el CRM interno (`CustomerManagement.vue`), mostrar el `registrationStatus`
  de cada cliente (pendiente/completado) y un botón de "Reenviar invitación" para
  los que sigan `pending`.

## 7. Petición para ChatGPT

1. Añadir el servicio `mailhog` a `compose.yaml` y las variables SMTP a la API,
   tal como se describe en la sección 5.
2. Implementar el envío de email en `CreateCustomer` (usando `@xtaskjs/mailer`,
   que ya está declarado como dependencia pero pendiente de integrar) para que,
   tras crear un cliente, se genere el token y se envíe la invitación por SMTP a
   MailHog.
3. Implementar los endpoints y casos de uso descritos en la sección 3
   (`GET`/`POST /api/customers/register/:token`, `POST
   /api/customers/:id/resend-invitation`), siguiendo el mismo patrón `@Service` +
   CQRS + controlador con guards ya consolidado en el resto del proyecto.
4. Implementar el modelo de consentimiento descrito en la sección 4
   (`DataProtectionConsent`), dejando el texto legal como una constante/plantilla
   fácilmente sustituible más adelante por el texto legal definitivo.
5. Implementar la vista de autorregistro en el frontend (`/customer/register`) y
   los ajustes correspondientes en `CustomerManagement.vue`.
6. Migración de datos: decidir y documentar qué ocurre con los clientes ya
   existentes en base de datos sin email antes de aplicar el `NOT NULL` en
   producción.
