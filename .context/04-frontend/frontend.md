# Requisitos técnicos — Frontend — xTechJS

- **Framework:** Vue.js, en su **versión más moderna** (Vue 3, Composition API).
- **Lenguaje:** TypeScript.
- **Arquitectura frontend:** separada por completo del backend (aplicación independiente que consume la API vía HTTP/REST y WebSockets), organizada de forma modular y extensible (por dominio/feature: clientes, reparaciones, tpv, almacén, chat, admin), facilitando añadir nuevas pantallas y funcionalidades sin reestructurar la app.
- Vistas diferenciadas según rol (admin / técnico / cliente), con enrutado y guards de navegación acordes al perfil autenticado.
- Soporte para carga y visualización de fotos/vídeos de las reparaciones.
- Interfaz de chat en tiempo real integrada con el backend (WebSockets).
