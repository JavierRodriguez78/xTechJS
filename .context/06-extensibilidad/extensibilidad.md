# Extensibilidad (requisito transversal) — xTechJS

Tanto el backend como el frontend deben diseñarse desde el inicio pensando en la incorporación futura de nuevas funcionalidades sin fricción, por ejemplo:

- Nuevos tipos de dispositivo o flujos de reparación específicos.
- Nuevos canales de notificación (WhatsApp/Telegram vía `@xtaskjs/bots`).
- Facturación electrónica/integración contable.
- Multi-tienda/multi-sede.
- Internacionalización (`@xtaskjs/internationalization`).
- Nuevos roles y permisos granulares.

Esto implica: módulos desacoplados, contratos (interfaces/puertos) claros entre capas, y evitar acoplamientos directos entre bounded contexts.
