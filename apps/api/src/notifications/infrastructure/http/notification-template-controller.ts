import { Body, Controller, Get, Post, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import { NOTIFICATION_PLACEHOLDERS } from "../../domain/notification-template.js";
import { ListNotificationTemplatesQuery, RemoveNotificationTemplateCommand, SaveNotificationTemplateCommand } from "../../application/cqrs/notification-messages.js";

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };

const saveSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{2,159}$/, "La clave usa minusculas, digitos, punto, guion o guion bajo"),
  subject: z.string().trim().min(1).max(320),
  body: z.string().trim().min(1).max(20000),
  enabled: z.boolean().optional()
});
const removeSchema = z.object({ key: z.string().trim().min(1).max(160) });

@Authenticated()
@Controller("/api/admin/config/notification-templates")
export class NotificationTemplateController {
  constructor(
    @InjectQueryBus() private readonly queryBus: QueryBus,
    @InjectCommandBus() private readonly commandBus: CommandBus
  ) {}

  @Get()
  @PermissionRequired(PERMISSIONS.usersManage)
  async listTemplates(): Promise<unknown> {
    return { templates: await this.queryBus.execute(new ListNotificationTemplatesQuery()), placeholders: NOTIFICATION_PLACEHOLDERS };
  }

  @Post()
  @PermissionRequired(PERMISSIONS.usersManage)
  async saveTemplate(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Plantilla no valida", issues: parsed.error.flatten() });
    const { key, subject, body: templateBody, enabled } = parsed.data;
    return this.commandBus.execute(new SaveNotificationTemplateCommand(key, { subject, body: templateBody, enabled: enabled ?? true }));
  }

  @Post("/remove")
  @PermissionRequired(PERMISSIONS.usersManage)
  async removeTemplate(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = removeSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Clave de plantilla no valida" });
    const removed = await this.commandBus.execute(new RemoveNotificationTemplateCommand(parsed.data.key));
    return removed ? { key: parsed.data.key } : reply.code(404).send({ message: "Plantilla no encontrada" });
  }
}
