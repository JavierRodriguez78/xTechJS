# Requisitos técnicos — Frontend — xTechJS

## 1. Stack y arquitectura

- **Framework:** Vue.js 3, Composition API con `<script setup>`.
- **Lenguaje:** TypeScript estricto.
- **Router:** Vue Router 4 con rutas nombradas y `meta` de permisos.
- **Estado:** Pinia, un store por feature (no un store global monolítico).
- **Arquitectura frontend:** separada por completo del backend (aplicación
  independiente que consume la API vía HTTP/REST y WebSockets), organizada de
  forma modular y extensible por dominio/feature: `clientes`, `reparaciones`,
  `tpv`, `almacen`, `chat`, `admin`.
- Vistas diferenciadas según rol (admin / técnico / cliente), con enrutado y
  guards de navegación acordes al perfil autenticado.
- Soporte para carga y visualización de fotos/vídeos de las reparaciones.
- Interfaz de chat en tiempo real integrada con el backend (WebSockets).
- Todo `fetch` genera y propaga `x-correlation-id` (ya implementado, mantener).

---

## 2. REGLA DE ORO DE LA UI — separación listado / detalle

> **Esta sección es normativa y prevalece sobre cualquier otra consideración
> estética. Si una propuesta de pantalla la incumple, es incorrecta y debe
> rehacerse.**

### 2.1. Lo que está PROHIBIDO

**Está prohibido renderizar el listado y el formulario de detalle/edición en la
misma pantalla, en columnas paralelas.** El patrón "master-detail de dos
columnas" (listado a la izquierda, ficha editable a la derecha) **no se usa en
ninguna parte de esta aplicación**. Motivos:

- No escala cuando la entidad tiene más de 6-8 campos: la columna de detalle se
  vuelve un scroll infinito comprimido en media pantalla.
- Impide tener pestañas internas en el detalle (facturación, adjuntos,
  historial, chat), que es un requisito de este proyecto.
- Rompe en tablet y móvil, donde no hay ancho para dos columnas.
- No permite enlazar directamente a un registro concreto (no hay URL propia
  del detalle), lo que impide compartir enlaces, abrir en pestaña nueva o
  recargar la página manteniendo el contexto.

Concretamente, **queda prohibido**:

- Un `<div>` de listado y un `<form>` de edición como hermanos en la misma vista.
- Que hacer clic en una fila del listado rellene un formulario situado al lado.
- Que el botón "Nuevo" limpie ese formulario lateral en lugar de navegar.
- Meter todas las secciones del detalle (datos, facturación, historial,
  adjuntos) apiladas verticalmente en la misma página sin pestañas.

### 2.2. Lo que es OBLIGATORIO

Cada entidad gestionable (cliente, reparación, material, proveedor, orden de
compra, cobro, usuario) tiene **rutas independientes**:

| Propósito | Ruta | Vista |
|---|---|---|
| Listado con filtros | `/clientes` | `CustomerListView.vue` |
| Alta | `/clientes/nuevo` | `CustomerCreateView.vue` |
| Detalle (solo lectura + pestañas) | `/clientes/:id` | `CustomerDetailView.vue` |
| Edición | `/clientes/:id/editar` | `CustomerEditView.vue` |

Navegar del listado al detalle es **una navegación de router real**
(`router.push`), con su propia URL, su propia entrada en el historial del
navegador, y su propio ciclo de carga. No es un cambio de estado local.

### 2.3. Patrón de pestañas dentro del detalle

Las secciones del detalle que no sean los datos identificativos principales
**van en pestañas, y cada pestaña es una sub-ruta anidada** (`children` de Vue
Router), de forma que cada una tiene URL propia:

```
/clientes/:id                    -> redirige a /clientes/:id/general
/clientes/:id/general            -> datos de contacto y dirección
/clientes/:id/facturacion        -> NIF/CIF, dirección fiscal, razón social
/clientes/:id/reparaciones       -> histórico de órdenes de ese cliente
/clientes/:id/comunicaciones     -> notificaciones enviadas, invitación de registro
/clientes/:id/notas              -> notas internas y etiquetas
```

Cada pestaña carga sus datos **bajo demanda** al activarse, no todas al entrar
en el detalle. El endpoint de la ficha (`GET /api/customers/:id`) devuelve solo
los datos de la cabecera y de la pestaña general; el histórico de reparaciones
se pide a `GET /api/customers/:id/repairs` únicamente cuando el usuario abre esa
pestaña.

Poder enlazar directamente a `/clientes/42/reparaciones` es un requisito, no un
extra: el técnico debe poder pegar ese enlace en el chat interno.

### 2.4. Anatomía obligatoria de una vista de detalle

De arriba abajo:

1. **Breadcrumb**: `Clientes / Javier Rodríguez` — el primer segmento navega de
   vuelta al listado **conservando los filtros que estaban aplicados**
   (ver 3.4).
2. **Cabecera de entidad**: nombre o identificador principal, estado (badge),
   etiquetas, y las acciones primarias a la derecha (Editar, Eliminar, y las
   acciones propias del dominio: Reenviar invitación, Cambiar estado, Imprimir).
   La cabecera es persistente: se ve igual en todas las pestañas.
3. **Barra de pestañas**.
4. **Contenido de la pestaña activa**.

La vista de detalle es **solo lectura por defecto**. Editar es una acción
explícita que lleva a `/clientes/:id/editar`, o abre la edición en línea de una
sección concreta. Nunca se muestra un formulario editable "por si acaso".

### 2.5. Excepción única

Solo se permite un panel lateral (drawer) en lugar de una ruta de detalle
cuando **la entidad tiene 3 campos o menos y no tiene pestañas**. Ejemplo:
etiquetas de cliente, métodos de pago del catálogo. Cualquier cosa más compleja
va a ruta propia.

---

## 3. Especificación de las vistas de LISTADO

### 3.1. Estructura obligatoria

Toda vista de listado tiene, de arriba abajo:

1. **Título de sección** y contador de resultados.
2. **Acción primaria** arriba a la derecha: `+ Nuevo cliente` — navega a
   `/clientes/nuevo`, **no abre un formulario lateral**.
3. **Barra de filtros** (ver 3.2), siempre visible, no colapsada por defecto en
   escritorio.
4. **Tabla o lista de resultados** (ver 3.3).
5. **Paginación** (ver 3.5).

### 3.2. Filtros — obligatorios en todos los listados

Ningún listado se entrega sin filtros. Como mínimo, cada listado tiene:

- **Buscador de texto libre** con `debounce` de 300 ms, que busca en los campos
  identificativos de la entidad. Para clientes: nombre/razón social, email,
  teléfono, NIF/DNI. Para reparaciones: número de orden, cliente, marca, modelo,
  número de serie.
- **Filtros por faceta**, en desplegables, específicos de cada entidad:

| Listado | Filtros mínimos |
|---|---|
| Clientes | Estado de registro (pendiente/completado), etiqueta (particular/empresa/recurrente), rango de fecha de alta |
| Reparaciones | Estado del flujo, técnico asignado, tipo de dispositivo, cliente, rango de fechas de entrada |
| Almacén | Categoría de material, proveedor, solo stock bajo mínimo, sin stock |
| Órdenes de compra | Estado (borrador/enviada/recibida), proveedor, rango de fechas |
| Cobros (TPV) | Método de pago, estado (cobrado/reembolsado), técnico, rango de fechas |
| Usuarios | Rol, activo/inactivo |

- **Botón "Limpiar filtros"**, visible solo cuando hay algún filtro aplicado.
- **Contador de filtros activos** junto al botón, cuando hay más de uno.

### 3.3. Tabla de resultados

- Columnas relevantes y escaneables, **nunca todos los campos de la entidad**.
  Para clientes: nombre, email, teléfono, etiquetas, estado de registro, nº de
  reparaciones, fecha de alta.
- **Ordenación por columna** en las columnas que tengan sentido (fecha, nombre,
  importe, stock), reflejada en la URL.
- La **fila completa es clicable** y navega al detalle. Además, un enlace
  explícito en la primera columna para permitir `Ctrl+clic` / abrir en pestaña
  nueva.
- **Acciones rápidas por fila** en la última columna, solo las de uso frecuente
  que no requieren contexto (editar, eliminar). Todo lo demás vive en el
  detalle.
- **Estados vacíos explícitos y distintos**: "aún no hay clientes registrados"
  (lista vacía real, con CTA de alta) es diferente de "ningún cliente coincide
  con los filtros" (con botón de limpiar filtros).
- **Estado de carga** con skeleton rows, no con un spinner que sustituya toda la
  tabla — evita el salto de layout.

### 3.4. Estado de filtros en la URL — obligatorio

**Todos los filtros, la ordenación y la página actual se serializan en la query
string.**

```
/clientes?q=rodriguez&estado=pending&etiqueta=empresa&orden=createdAt:desc&pagina=2
```

Esto es obligatorio porque:

- Permite compartir un listado filtrado por chat interno.
- Recargar la página (F5) no pierde el trabajo de filtrado.
- El botón "atrás" del navegador desde el detalle devuelve al listado **con los
  filtros intactos**, sin necesidad de guardar estado en un store.

La vista lee los filtros de `route.query` al montarse y los escribe con
`router.replace` cuando cambian (`replace`, no `push`, para no llenar el
historial con cada tecla del buscador).

### 3.5. Paginación

- Paginación real en servidor, nunca traer la tabla completa y paginar en
  cliente.
- Tamaño de página configurable (25 / 50 / 100), por defecto 25.
- La API debe devolver `{ items, total, page, pageSize }`. Si algún endpoint de
  listado actual no lo hace, hay que ampliarlo antes de construir la vista.

---

## 4. Especificación de las vistas de FORMULARIO (alta y edición)

- Formulario a **una sola columna**, ancho máximo ~640px, centrado. Nunca dos
  columnas de campos: perjudica el escaneo vertical y rompe en tablet.
- Campos agrupados en **secciones con encabezado** (`Datos de contacto`,
  `Dirección`, `Facturación`, `Notas internas`), separadas visualmente.
- Si el formulario supera ~12 campos, se divide en **pestañas o pasos**, con la
  misma lógica de sub-rutas que el detalle.
- **Validación en cliente** al perder el foco del campo (`blur`), y de nuevo al
  enviar. Los errores del servidor (422) se mapean al campo correspondiente,
  no se muestran como un banner genérico.
- **Botones de acción fijos al pie del formulario**: `Cancelar` (secundario,
  vuelve atrás) y `Guardar` (primario). En formularios largos, la barra de
  acciones es `sticky` al fondo del viewport.
- **Aviso de cambios sin guardar**: guard `onBeforeRouteLeave` que pide
  confirmación si el formulario está sucio.
- Tras guardar con éxito: navegar al **detalle** de la entidad
  (`/clientes/:id`), no volver al listado, y mostrar un toast de confirmación.

---

## 5. Layout general y navegación

- **Layout de aplicación** con navegación lateral persistente (sidebar) en
  escritorio: CRM, Reparaciones, Almacén, TPV, Chat, Administración. Colapsable
  a iconos.
- En tablet y móvil, la navegación pasa a un menú desplegable o barra inferior.
- **Cabecera superior** con: breadcrumb contextual, buscador global (fase
  posterior), notificaciones, y menú de usuario (perfil, cerrar sesión, y el
  indicador de suplantación cuando el admin está impersonando).
- **Indicador de suplantación**: cuando un admin está suplantando a otro
  usuario, una banda fija de color de advertencia en la parte superior con el
  texto "Estás viendo la aplicación como <usuario>" y un botón "Volver a mi
  sesión". Es un requisito de trazabilidad, no un adorno.
- El portal de cliente (`/customer`) tiene **su propio layout**, mucho más
  simple, sin sidebar de módulos internos.

---

## 6. Estructura de carpetas del frontend

```
apps/web/src/
├── app/
│   ├── router/
│   │   ├── index.ts              # router raíz, guards globales
│   │   └── routes/               # un fichero de rutas por feature
│   ├── layouts/
│   │   ├── AppLayout.vue         # layout interno (sidebar + header)
│   │   ├── CustomerLayout.vue    # layout del portal de cliente
│   │   └── BlankLayout.vue       # login, registro público
│   └── plugins/
├── features/
│   ├── customers/
│   │   ├── views/
│   │   │   ├── CustomerListView.vue
│   │   │   ├── CustomerDetailView.vue
│   │   │   ├── CustomerCreateView.vue
│   │   │   ├── CustomerEditView.vue
│   │   │   └── tabs/
│   │   │       ├── CustomerGeneralTab.vue
│   │   │       ├── CustomerBillingTab.vue
│   │   │       ├── CustomerRepairsTab.vue
│   │   │       └── CustomerNotesTab.vue
│   │   ├── components/           # componentes propios de la feature
│   │   ├── composables/          # useCustomerFilters, useCustomerForm
│   │   ├── api/                  # llamadas HTTP de la feature
│   │   ├── stores/               # store Pinia de la feature
│   │   └── types.ts
│   ├── repairs/                  # misma estructura
│   ├── inventory/
│   ├── pos/
│   ├── chat/
│   └── admin/
└── shared/
    ├── components/
    │   ├── DataTable.vue         # tabla con orden, selección, estados
    │   ├── FilterBar.vue         # barra de filtros reutilizable
    │   ├── EntityHeader.vue      # cabecera de detalle con acciones
    │   ├── TabNav.vue            # navegación de pestañas por sub-ruta
    │   ├── FormSection.vue
    │   ├── EmptyState.vue
    │   ├── ConfirmDialog.vue
    │   └── AppPagination.vue
    ├── composables/
    │   ├── useUrlFilters.ts      # sincroniza filtros <-> query string
    │   ├── usePaginatedList.ts   # carga paginada + estados
    │   └── useUnsavedChanges.ts
    ├── api/
    │   └── httpClient.ts         # fetch + JWT + x-correlation-id
    └── types/
```

Los componentes de `shared/components` son la base: **una vista de listado
nueva se construye componiendo `FilterBar` + `DataTable` + `AppPagination`, no
escribiendo una tabla a mano**. Si un listado necesita algo que estos
componentes no dan, se amplía el componente compartido, no se duplica.

---

## 7. Router — convenciones

- Rutas **nombradas** siempre (`name: 'customers.detail'`), y navegación por
  nombre, nunca por string de path concatenado.
- `meta` de cada ruta declara el permiso requerido:
  `meta: { permission: 'customers:manage' }`. Un guard global lo comprueba
  contra los permisos del JWT y redirige a 403 si no.
- Sub-rutas de pestañas como `children`, con `redirect` de la ruta padre a la
  primera pestaña.
- Lazy loading por feature: `component: () => import('...')`.

Ejemplo de definición para clientes:

```ts
{
  path: '/clientes',
  name: 'customers.list',
  component: () => import('@/features/customers/views/CustomerListView.vue'),
  meta: { permission: 'customers:read' },
},
{
  path: '/clientes/nuevo',
  name: 'customers.create',
  component: () => import('@/features/customers/views/CustomerCreateView.vue'),
  meta: { permission: 'customers:manage' },
},
{
  path: '/clientes/:id',
  component: () => import('@/features/customers/views/CustomerDetailView.vue'),
  meta: { permission: 'customers:read' },
  redirect: { name: 'customers.detail.general' },
  children: [
    { path: 'general',        name: 'customers.detail.general',        component: () => import('.../tabs/CustomerGeneralTab.vue') },
    { path: 'facturacion',    name: 'customers.detail.billing',        component: () => import('.../tabs/CustomerBillingTab.vue') },
    { path: 'reparaciones',   name: 'customers.detail.repairs',        component: () => import('.../tabs/CustomerRepairsTab.vue') },
    { path: 'comunicaciones', name: 'customers.detail.communications', component: () => import('.../tabs/CustomerCommsTab.vue') },
    { path: 'notas',          name: 'customers.detail.notes',          component: () => import('.../tabs/CustomerNotesTab.vue') },
  ],
},
{
  path: '/clientes/:id/editar',
  name: 'customers.edit',
  component: () => import('@/features/customers/views/CustomerEditView.vue'),
  meta: { permission: 'customers:manage' },
}
```

---

## 8. Mapa de rutas por módulo

### CRM — Clientes
```
/clientes                              listado con filtros
/clientes/nuevo                        alta
/clientes/:id/general                  datos de contacto
/clientes/:id/facturacion              datos fiscales
/clientes/:id/reparaciones             histórico de órdenes
/clientes/:id/comunicaciones           emails enviados, invitación de registro
/clientes/:id/notas                    notas internas y etiquetas
/clientes/:id/editar                   edición
```

### Reparaciones
```
/reparaciones                          listado con filtros
/reparaciones/nueva                    alta de orden
/reparaciones/:id/general              equipo, cliente, avería, accesorios
/reparaciones/:id/diagnostico          diagnóstico técnico y tiempo invertido
/reparaciones/:id/presupuesto          líneas de presupuesto y aprobación
/reparaciones/:id/materiales           repuestos consumidos (enlace a almacén)
/reparaciones/:id/adjuntos             fotos y vídeos del proceso
/reparaciones/:id/historial            línea de tiempo de cambios de estado
/reparaciones/:id/chat                 conversación con el cliente
/reparaciones/:id/cobros               pagos asociados a esta orden
/reparaciones/:id/editar               edición
```

### Almacén
```
/almacen                               listado de materiales con filtros
/almacen/nuevo
/almacen/:id/general                   ficha del material y stock actual
/almacen/:id/movimientos               entradas, salidas y consumos
/almacen/:id/proveedores               proveedores de ese material
/almacen/:id/editar
/almacen/proveedores                   listado de proveedores
/almacen/proveedores/:id
/almacen/ordenes-compra                listado de órdenes de compra
/almacen/ordenes-compra/:id
/almacen/alertas                       stock bajo mínimo
```

### TPV
```
/tpv                                   listado de cobros con filtros
/tpv/nuevo                             registrar cobro
/tpv/:id                               detalle del cobro y recibo
/tpv/caja                              caja diaria (apertura/cierre)
/tpv/informes                          reportes por rango
```

### Administración
```
/admin/usuarios                        listado con filtros
/admin/usuarios/:id/general
/admin/usuarios/:id/permisos
/admin/usuarios/:id/auditoria
/admin/configuracion/estados           flujos de estado de reparación
/admin/configuracion/dispositivos      tipos de dispositivo
/admin/configuracion/plantillas        plantillas de notificación
/admin/auditoria                       log de suplantaciones y acciones
```

---

## 9. Comportamiento responsive

- **Escritorio (>=1024px)**: sidebar visible, tablas completas, filtros en línea.
- **Tablet (768-1023px)**: sidebar colapsada a iconos, tablas con menos
  columnas, filtros en un desplegable.
- **Móvil (<768px)**: navegación inferior o menú hamburguesa; **las tablas se
  convierten en tarjetas apiladas**, no en tablas con scroll horizontal; los
  filtros se abren en un panel a pantalla completa; las pestañas del detalle
  pasan a un selector desplegable si no caben.

El taller usa tablets para trabajar sobre las órdenes de reparación, así que el
breakpoint de tablet es de uso real, no un caso teórico.

---

## 10. Estados, errores y feedback

- **Carga**: skeletons que respetan la forma del contenido final. Nunca un
  spinner centrado que colapse el layout.
- **Error de carga**: mensaje con el `correlationId` visible (útil para
  `make trace`) y botón de reintentar.
- **Acciones destructivas**: siempre `ConfirmDialog`, con el nombre de la
  entidad en el texto de confirmación.
- **Éxito**: toast breve, no bloqueante, arriba a la derecha.
- **Sesión expirada (401)**: redirigir a login conservando la ruta de origen en
  `?redirect=`, para volver donde estaba tras autenticarse.

---

## 11. Checklist de aceptación de una pantalla

Antes de dar por buena cualquier vista generada, debe cumplir todo esto:

- [ ] El listado y el detalle son rutas distintas, con URL propia.
- [ ] El detalle tiene pestañas, y cada pestaña es una sub-ruta navegable.
- [ ] El listado tiene buscador con debounce y al menos dos filtros por faceta.
- [ ] Los filtros, el orden y la página están en la query string.
- [ ] Volver atrás desde el detalle conserva los filtros del listado.
- [ ] Hay estado vacío distinto para "sin datos" y "sin resultados".
- [ ] Hay estado de carga con skeleton y estado de error con reintento.
- [ ] El formulario es de una columna, con secciones y validación por campo.
- [ ] Salir de un formulario sucio pide confirmación.
- [ ] La vista funciona en 768px de ancho (tablet del taller).
- [ ] La ruta declara su `meta.permission` y el guard lo aplica.
- [ ] Se usan los componentes de `shared/components`, no tablas escritas a mano.

---

## 12. Migración de lo ya implementado

Las vistas actuales de CRM, reparaciones, almacén y TPV están construidas con el
patrón prohibido (listado y ficha en la misma pantalla, sin filtros) y la
navegación sigue siendo una bifurcación por `pathname`, no un router Vue. Se
deben migrar en este orden, una feature completa por iteración:

0. **Introducir Vue Router y los layouts** como paso previo: sin router no es
   posible cumplir nada de la sección 2.
1. **Clientes** — es la que más campos tiene tras incorporar facturación y
   registro, y la que peor sufre el patrón actual. Sirve de plantilla para el
   resto.
2. **Reparaciones** — la que más pestañas necesita (diagnóstico, presupuesto,
   materiales, adjuntos, historial, chat, cobros).
3. **Almacén** — incluye además los sub-listados de proveedores y órdenes de
   compra.
4. **TPV** — el listado de cobros y el detalle del recibo.

En cada migración se extraen a `shared/components` las piezas reutilizables que
aparezcan, de forma que la siguiente feature sea más rápida que la anterior.
