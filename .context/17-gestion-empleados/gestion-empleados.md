# Gestión de empleados — xTechJS

Este documento separa la **gestión de empleados** (alta, edición, roles,
acceso por tienda y baja del personal de taller: admin y técnico) de la
gestión genérica de usuarios ya implementada (`apps/api/src/users`,
`UserController`, pantalla de "Usuarios"), que hoy mezcla conceptualmente
staff y el rol `customer` bajo el mismo endpoint aunque en la práctica los
clientes nunca se den de alta por ahí (se autorregistran, ver
`11-alta-clientes/registro-cliente.md`). No se duplica la tabla ni la
autenticación: un empleado sigue siendo una fila de `User` con
`role: "admin" | "technician"`; lo que cambia es la pantalla, los campos que
recoge y las reglas de acceso a tiendas.

## 1. Qué debe permitir la gestión de empleados

- **Alta** de un empleado con los datos necesarios (sección 2).
- **Edición**: datos personales, rol y tiendas a las que tiene acceso.
- **Baja**: desactivar al empleado (no se borra físicamente, ver sección 4).
- Todo ello desde una pantalla propia de "Empleados", separada de cualquier
  gestión general de "Usuarios", porque en este negocio el único personal
  interno son administradores y técnicos.

## 2. Modelo de datos del empleado

Se amplía `User`/`UserCredentials` (ya implementados) con los campos
necesarios para dar de alta, contactar y ubicar a un empleado, reutilizando
el mismo selector de provincia, ciudad y código postal ya construido para la
ficha de tienda (`16-alta-tienda/alta-tienda.md` sección 3.2), en vez de
crear un segundo componente de dirección distinto:

```ts
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole; // en la pantalla de empleados, restringido a "admin" | "technician"
  active: boolean;

  // Sustituyen a `storeId` (ver sección 3, resuelve la decisión abierta de 15-multitienda.md):
  defaultStoreId: string | null;  // tienda principal/preseleccionada; null solo para admin global
  storeAccess: string[] | null;   // tiendas a las que tiene acceso; null = acceso a todas (admin global)

  // Nuevos, todos opcionales salvo donde se indique:
  phone?: string | null;
  nationalId?: string | null;        // DNI/NIE — visibilidad restringida, ver sección 4
  addressStreet?: string | null;
  addressPostalCode?: string | null;
  addressCity?: string | null;
  addressProvince?: string | null;
  addressCountry?: string | null;    // "España" por defecto
  hiredAt?: Date | null;             // fecha de alta como empleado
  deactivatedAt?: Date | null;       // se rellena automáticamente al dar de baja
}
```

- `nationalId`, teléfono y dirección son opcionales porque no todos los
  negocios necesitan guardarlos para operar el día a día; se recogen solo si
  el propio negocio decide pedirlos.
- No se añade ningún campo de nómina, Seguridad Social, categoría
  profesional ni salario — ver decisión abierta 7.1.

## 3. Acceso a varias tiendas (resuelve una decisión abierta de multitienda)

`15-multitienda/multitienda.md` dejaba como decisión abierta si un técnico
podía pertenecer a más de una tienda. Esta funcionalidad lo resuelve: un
empleado puede tener acceso a **varias tiendas** (`storeAccess`), con una
**tienda por defecto** (`defaultStoreId`) que se usa para preseleccionar
formularios (alta de reparación, consulta de almacén, etc.). Reglas:

- **Técnico**: `storeAccess` obligatorio, no vacío, y debe incluir
  `defaultStoreId`. Solo ve y gestiona reparaciones, almacén y caja de las
  tiendas listadas en `storeAccess`.
- **Admin global**: `storeAccess: null` (acceso a todas las tiendas, actual y
  futuras, sin tener que mantener la lista al crear una tienda nueva).
  `defaultStoreId` puede ser `null` o una tienda concreta, solo como
  preselección de formularios.
- **Admin de tienda**: igual que técnico, con `storeAccess` acotado a una o
  varias tiendas concretas.
- Todo filtro de alcance por tienda ya descrito en
  `15-multitienda/multitienda.md` (reparaciones, almacén, caja, traspasos,
  dashboard) pasa de comprobar "¿coincide con mi `storeId`?" a "¿está mi
  `storeAccess` incluye esta tienda, o es `null`?".
- Migración de datos: cada usuario existente con `storeId` no nulo pasa a
  `defaultStoreId = storeId`, `storeAccess = [storeId]`; los que tengan
  `storeId: null` (admin global) pasan a `storeAccess: null`.

## 4. Protección de datos del empleado (RGPD / LOPDGDD)

El tratamiento de los datos de un empleado tiene una **base legal distinta**
a la de un cliente, y eso cambia cómo se recoge:

- **Base legal: ejecución de la relación laboral** (art. 6.1.b RGPD, y art. 9
  LOPDGDD para el contexto de recursos humanos), **no un consentimiento**
  marcado por el propio empleado. Por eso esta funcionalidad **no replica**
  la casilla de aceptación que sí se exige a los clientes en
  `11-alta-clientes/registro-cliente.md`: pedirle a un empleado que "acepte"
  el tratamiento de los datos necesarios para su propio puesto no sería un
  consentimiento libre, y jurídicamente no es la base aplicable.
- **Minimización de datos**: solo se guardan los datos necesarios para
  identificar, contactar y ubicar al empleado dentro de la operativa del
  taller. No se guarda número de afiliación a la Seguridad Social, IBAN,
  categoría profesional ni salario (decisión abierta 7.1), y en ningún caso
  datos de categoría especial del art. 9 RGPD (salud, afiliación sindical,
  etc.) — la ficha de empleado no debe tener ningún campo para ello.
- **DNI/NIE con visibilidad restringida**: es un dato identificativo
  sensible por su capacidad de uso fraudulento si se expone. Se guarda, pero
  su visualización queda restringida a admin, mostrado solo bajo una acción
  explícita ("mostrar DNI/NIE"), nunca en el listado ni en exportaciones —
  mismo patrón ya aplicado al PIN del dispositivo en
  `14-alta-reparacion/alta-reparacion.md` sección 2.2.
- **Conservación**: mientras dure la relación laboral y, tras la baja,
  durante el plazo de prescripción de responsabilidades laborales/fiscales
  aplicable (orientativamente 4 años, a confirmar con la gestoría — ver
  decisión abierta 7.2). No se implementa un borrado automático por plazo en
  esta fase; `deactivatedAt` deja constancia de cuándo se produjo la baja
  para poder aplicarlo manualmente si se decide más adelante.
- **Baja, no borrado**: dar de baja a un empleado (`active: false`) le
  impide iniciar sesión pero conserva intactas sus reparaciones, movimientos
  de almacén y demás trazas ya generadas, igual que ya se exige para el
  resto de entidades del proyecto. No se contempla el borrado físico salvo
  que el propio empleado ejerza su derecho de supresión, caso en el que
  debe poder atenderse sin romper la trazabilidad de operaciones ya
  realizadas (anonimizar `displayName`/datos personales conservando el
  identificador interno, en vez de borrar la fila).
- **Auditoría**: los cambios de rol, de `storeAccess`/`defaultStoreId` y la
  baja de un empleado deben quedar registrados en el log de auditoría ya
  existente (`ListAuditLogs`), igual que ya ocurre con la suplantación de
  usuario (`01-roles-permisos/roles.md`).

## 5. Frontend

Pantalla `/admin/empleados` (alias `/admin/employees`; listado y ficha
separados, según la regla de oro de `04-frontend/frontend.md`):

- **Listado**: filtros por tienda, rol y estado (activo/baja).
- **Alta/edición**: nombre, email, teléfono, rol (admin/técnico), tienda por
  defecto, tiendas con acceso (selección múltiple), DNI/NIE (opcional, con
  el mismo tratamiento de "mostrar/ocultar" que el PIN de dispositivo) y
  dirección, reutilizando el mismo componente de provincia/ciudad/código
  postal ya construido para la ficha de tienda.
- **Baja**: acción explícita de desactivar, con confirmación, que registra
  `deactivatedAt` y queda en el log de auditoría.
- Se recomienda que esta pantalla **sustituya** a la actual de "Usuarios" en
  el menú del panel admin (renombrándola a "Empleados"), ya que no existe
  ningún otro tipo de usuario interno que se dé de alta por ese camino.
  La navegación ya muestra **Empleados**. Las rutas y API genéricas de
  Usuarios se conservan para compatibilidad y quedan restringidas a
  administradores globales.

### 5.1. Perfil propio del empleado

Desde el desplegable de usuario de la cabecera se accede a `/mi-perfil`,
independiente de las fichas administrativas de empleados. Administradores y
tecnicos pueden cambiar exclusivamente su email de acceso y su contrasena,
confirmando la contrasena actual en ambos casos. No se permite modificar
rol, tiendas asignadas, identidad laboral ni datos de otro empleado.

La funcionalidad se define en `04-frontend/frontend.md`, seccion 5.1:
consulta y cambio autenticados en `/api/auth/staff/profile`, validacion
de email unico, hash bcrypt y confirmacion de nueva contrasena en cliente.
Cambiar email actualiza la sesion; cambiar contrasena cierra la sesion
actual para volver a entrar. No requiere el permiso `users:manage` y no
sustituye la gestion administrativa descrita en este documento.

## 6. Permisos

No se añade un permiso nuevo en esta fase: la gestión de empleados sigue
protegida por `users:manage` (admin), igual que hoy. Si en el futuro se
quiere separar conceptualmente "gestión de empleados" de otra configuración
que hoy también cuelga de `users:manage` (tipos de dispositivo, catálogo de
reparación, etc.), se puede introducir un permiso `employees:manage`
específico sin romper nada — se deja como mejora incremental, no bloqueante.

## 7. Decisiones abiertas

1. **¿El negocio necesitará en algún momento gestión de nómina/RRHH**
   (categoría profesional, salario, IBAN, Seguridad Social)? Si la respuesta
   es sí, debe abordarse como una integración con un software de gestión
   laboral externo (o exportación de datos hacia la gestoría), no como parte
   de xTechJS — mezclar ambas cosas convertiría la aplicación en un gestor de
   RRHH, que no es su propósito.
2. **Plazo de conservación exacto de los datos de un empleado dado de
   baja** — a confirmar con la gestoría/asesoría laboral del negocio.
3. **Listado genérico de "Usuarios"**: resuelto para la navegación; el panel
  muestra Empleados y conserva las rutas/endpoints genéricos solo para
  compatibilidad, restringidos al administrador global. Clientes continúan
  su propio flujo de registro.

## 8. Alcance de implementacion

La implementación sustituye `users.store_id` por `default_store_id` y
`store_access`; emite ambos claims y mantiene `storeId` solo como alias de
compatibilidad en JWT. Los endpoints operativos comprueban pertenencia al
scope para reparaciones, técnico asignado, adjuntos/chat/notificaciones,
almacén, traspasos, pedidos de compra, pagos, caja y dashboard.

`/api/employees` y `/api/employees/:id` alimentan la pantalla separada de
listado y ficha. El selector de dirección reutiliza el catálogo postal de
tiendas. El DNI/NIE se excluye de consultas/listados generales y solo se
obtiene con una llamada explícita de administración. Altas, cambios de rol,
alcance, bajas y reactivaciones se registran en `audit_logs`.

`national_id` está excluido por defecto de TypeORM y solo se devuelve en el
endpoint explícito de consulta. El valor se almacena sin cifrado de aplicación
en PostgreSQL; cifrado en reposo, rotación de claves y plazo de purga siguen
pendientes de una decisión específica de protección de datos.

Los administradores globales usan `storeAccess: null`; los administradores
de tienda tienen arrays acotados. Estos últimos no pueden gestionar tiendas
globales, configuración, auditoría, usuarios genéricos, ecommerce,
compraventa transversal ni suplantación. Al dar de baja al propio usuario,
la API lo rechaza. No se añadieron datos de nómina ni Seguridad Social.

Migraciones: `AddEmployeeProfileAndStoreAccessMigration1740900000000`,
`ScopePurchasesAndCashByStoreMigration1741000000000` y la correctiva
`RemoveLegacyUserStoreIdMigration1741100000000` para instalaciones donde
la migración anterior ya estaba registrada. Los empleados históricos sin
fecha fiable conservan `hiredAt`/`deactivatedAt` nulos; los técnicos sin
tienda se asignan a la tienda principal creada por la migración multitienda.
