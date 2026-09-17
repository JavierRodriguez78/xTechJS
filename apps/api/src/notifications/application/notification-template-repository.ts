import type { NotificationTemplate, NotificationTemplateInput } from "../domain/notification-template.js";

export interface NotificationTemplateRepository {
  findAll(): Promise<readonly NotificationTemplate[]>;
  findByKey(key: string): Promise<NotificationTemplate | undefined>;
  save(key: string, input: NotificationTemplateInput): Promise<NotificationTemplate>;
  remove(key: string): Promise<boolean>;
}
