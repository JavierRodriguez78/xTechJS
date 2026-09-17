import { EntitySchema } from "typeorm";

export interface NotificationTemplateRecord {
  key: string;
  subject: string;
  body: string;
  enabled: boolean;
  updatedAt: Date;
}

export const NotificationTemplateEntitySchema = new EntitySchema<NotificationTemplateRecord>({
  name: "NotificationTemplate",
  tableName: "notification_templates",
  columns: {
    key: { type: String, primary: true },
    subject: { type: String },
    body: { type: "text" },
    enabled: { type: Boolean },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});
