import type { NotificationTemplateInput } from "../../domain/notification-template.js";

export class ListNotificationTemplatesQuery {}

export class SaveNotificationTemplateCommand {
  constructor(public readonly key: string, public readonly input: NotificationTemplateInput) {}
}

export class RemoveNotificationTemplateCommand {
  constructor(public readonly key: string) {}
}
