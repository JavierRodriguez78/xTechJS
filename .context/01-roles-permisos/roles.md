# Perfiles de usuario y permisos — xTechJS

La aplicación debe implementar **como mínimo 3 roles**, con separación estricta de permisos:

## Admin
- Acceso completo a todos los módulos de la aplicación (CRM, equipos, TPV, almacén, usuarios, configuración).
- Capacidad de **suplantar (impersonar/anonimizar) la sesión de cualquier usuario** dado de alta en la plataforma (técnico o cliente), para depuración, soporte o supervisión, quedando esta acción trazada en un log de auditoría (quién suplanta, a quién, cuándo, y qué acciones realiza durante la suplantación).
- Gestión de usuarios y roles, gestión de almacén/stock, configuración general del sistema.

## Técnico
- Acceso a la gestión de los equipos en reparación asignados o disponibles en el taller.
- Acceso a la información básica del equipo y del cliente propietario (datos de contacto, historial de reparaciones de ese cliente), sin acceso a datos administrativos o financieros globales.
- Puede añadir al expediente de la reparación: fotografías, vídeos, notas técnicas, cambios de estado, diagnóstico, presupuesto y materiales/repuestos utilizados (con descuento automático de stock).
- Acceso al chat con el cliente para atender consultas relacionadas con su reparación.

## Cliente
- Perfil asignado a todos los clientes del laboratorio.
- Puede ver el **estado en tiempo real** de sus reparaciones en curso.
- Dispone de un **histórico completo de reparaciones** pasadas (equipos, fechas, diagnósticos, costes, materiales usados).
- Puede consultar la información de su(s) equipo(s): ficha técnica, fotos y vídeos subidos por el técnico durante el proceso.
- Dispone de un **chat** para comunicarse con el técnico/laboratorio sobre su reparación.
- Puede consultar y, si aplica, pagar presupuestos/facturas asociados a sus reparaciones.

> El sistema de permisos debe diseñarse de forma extensible (RBAC o similar) para poder añadir roles adicionales en el futuro (p. ej. "recepción", "encargado de almacén") sin romper la arquitectura.
