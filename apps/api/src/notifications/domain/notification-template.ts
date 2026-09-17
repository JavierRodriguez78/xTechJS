export interface NotificationTemplate {
  key: string;
  subject: string;
  body: string;
  enabled: boolean;
  updatedAt: Date;
}

export interface NotificationTemplateInput {
  subject: string;
  body: string;
  enabled: boolean;
}

/** Marcadores que el administrador puede usar en el asunto y el cuerpo. */
export const NOTIFICATION_PLACEHOLDERS = [
  "customerName",
  "deviceType",
  "deviceBrand",
  "deviceModel",
  "reportedIssue",
  "status",
  "statusNote",
  "repairId",
  "portalUrl"
] as const;

export type NotificationPlaceholder = (typeof NOTIFICATION_PLACEHOLDERS)[number];

export type NotificationVariables = Partial<Record<NotificationPlaceholder, string>>;

const placeholderPattern = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** La clave de plantilla que corresponde a un estado del flujo de taller. */
export function repairStatusTemplateKey(status: string): string {
  return `repair.status.${status}`;
}

/**
 * Sustituye los marcadores conocidos. Un marcador desconocido (una errata del
 * administrador) se elimina en lugar de llegar al cliente como `{{...}}`.
 */
export function renderNotificationText(template: string, variables: NotificationVariables): string {
  return template.replace(placeholderPattern, (_match, name: string) => variables[name as NotificationPlaceholder] ?? "");
}

export function renderNotificationTemplate(template: NotificationTemplate, variables: NotificationVariables): { subject: string; body: string } {
  return {
    subject: renderNotificationText(template.subject, variables).trim(),
    body: renderNotificationText(template.body, variables).trim()
  };
}
