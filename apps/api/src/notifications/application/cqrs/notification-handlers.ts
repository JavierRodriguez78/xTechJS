import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { NotificationTemplate } from "../../domain/notification-template.js";
import { ListNotificationTemplates, RemoveNotificationTemplate, SaveNotificationTemplate } from "../manage-notification-templates.js";
import { ListNotificationTemplatesQuery, RemoveNotificationTemplateCommand, SaveNotificationTemplateCommand } from "./notification-messages.js";

@Service()
@QueryHandler(ListNotificationTemplatesQuery)
export class ListNotificationTemplatesHandler implements IQueryHandler<ListNotificationTemplatesQuery, readonly NotificationTemplate[]> {
  constructor(private readonly useCase: ListNotificationTemplates) {}

  execute(): Promise<readonly NotificationTemplate[]> {
    return this.useCase.execute();
  }
}

@Service()
@CommandHandler(SaveNotificationTemplateCommand)
export class SaveNotificationTemplateHandler implements ICommandHandler<SaveNotificationTemplateCommand, NotificationTemplate> {
  constructor(private readonly useCase: SaveNotificationTemplate) {}

  execute(command: SaveNotificationTemplateCommand): Promise<NotificationTemplate> {
    return this.useCase.execute(command.key, command.input);
  }
}

@Service()
@CommandHandler(RemoveNotificationTemplateCommand)
export class RemoveNotificationTemplateHandler implements ICommandHandler<RemoveNotificationTemplateCommand, boolean> {
  constructor(private readonly useCase: RemoveNotificationTemplate) {}

  execute(command: RemoveNotificationTemplateCommand): Promise<boolean> {
    return this.useCase.execute(command.key);
  }
}
