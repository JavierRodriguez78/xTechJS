import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { NotificationTemplateRepository } from "../../application/notification-template-repository.js";
import type { NotificationTemplate, NotificationTemplateInput } from "../../domain/notification-template.js";
import { NotificationTemplateEntitySchema, type NotificationTemplateRecord } from "./notification-template-entity.js";

function toTemplate(record: NotificationTemplateRecord): NotificationTemplate {
  return { key: record.key, subject: record.subject, body: record.body, enabled: record.enabled, updatedAt: record.updatedAt };
}

@Traceable("PostgresNotificationTemplateRepository")
@Service({ name: "notificationTemplateRepository" })
export class PostgresNotificationTemplateRepository implements NotificationTemplateRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async findAll(): Promise<readonly NotificationTemplate[]> {
    const records = await this.dataSource.getRepository(NotificationTemplateEntitySchema).find({ order: { key: "ASC" } });
    return records.map(toTemplate);
  }

  async findByKey(key: string): Promise<NotificationTemplate | undefined> {
    const record = await this.dataSource.getRepository(NotificationTemplateEntitySchema).findOneBy({ key });
    return record ? toTemplate(record) : undefined;
  }

  async save(key: string, input: NotificationTemplateInput): Promise<NotificationTemplate> {
    const repository = this.dataSource.getRepository(NotificationTemplateEntitySchema);
    await repository.save({ key, subject: input.subject, body: input.body, enabled: input.enabled, updatedAt: new Date() });
    const saved = await repository.findOneBy({ key });
    if (!saved) throw new Error(`Notification template ${key} could not be persisted`);
    return toTemplate(saved);
  }

  async remove(key: string): Promise<boolean> {
    const result = await this.dataSource.getRepository(NotificationTemplateEntitySchema).delete({ key });
    return (result.affected ?? 0) > 0;
  }
}
