import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { NotificationTemplate, NotificationTemplateInput } from "../domain/notification-template.js";
import type { NotificationTemplateRepository } from "./notification-template-repository.js";

@Traceable("ListNotificationTemplates")
@Service()
export class ListNotificationTemplates {
  constructor(@Qualifier("notificationTemplateRepository") private readonly repository: NotificationTemplateRepository) {}

  execute(): Promise<readonly NotificationTemplate[]> {
    return this.repository.findAll();
  }
}

@Traceable("SaveNotificationTemplate")
@Service()
export class SaveNotificationTemplate {
  constructor(@Qualifier("notificationTemplateRepository") private readonly repository: NotificationTemplateRepository) {}

  execute(key: string, input: NotificationTemplateInput): Promise<NotificationTemplate> {
    return this.repository.save(key.trim(), {
      subject: input.subject.trim(),
      body: input.body.trim(),
      enabled: input.enabled
    });
  }
}

@Traceable("RemoveNotificationTemplate")
@Service()
export class RemoveNotificationTemplate {
  constructor(@Qualifier("notificationTemplateRepository") private readonly repository: NotificationTemplateRepository) {}

  execute(key: string): Promise<boolean> {
    return this.repository.remove(key.trim());
  }
}
