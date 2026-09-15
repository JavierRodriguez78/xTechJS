import { Body, Controller, Get, Param, Patch, Post, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { AdminConfigService } from "../../application/admin-config.js";
import { CreateUserCommand, ListAuditLogsQuery, ListTechniciansQuery, ListUsersQuery, UpdateUserCommand } from "../../application/cqrs/user-messages.js";
import { PERMISSIONS } from "../../domain/permission.js";
import { PermissionRequired } from "./permission-guard.js";

type ControllerReply = { code(statusCode: number): ControllerReply; send(payload: unknown): unknown };
const userSchema = z.object({ email: z.string().trim().email().max(320), displayName: z.string().trim().min(1).max(160), role: z.enum(["admin", "technician", "customer"]), password: z.string().min(12).max(256) });
const updateUserSchema = userSchema.partial().extend({ active: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0, "At least one field is required");
const configValueSchema = z.object({ value: z.string().trim().min(1).max(160) });

@Authenticated()
@Controller("/api")
export class UserController {
  constructor(
    @InjectQueryBus() private readonly queryBus: QueryBus,
    @InjectCommandBus() private readonly commandBus: CommandBus,
    private readonly adminConfigService: AdminConfigService
  ) {}

  @Get("/users")
  @PermissionRequired(PERMISSIONS.usersManage)
  listUsers(): Promise<unknown> {
    return this.queryBus.execute(new ListUsersQuery());
  }

  @Get("/users/audit")
  @PermissionRequired(PERMISSIONS.usersManage)
  listAuditLogs(): Promise<unknown> {
    return this.queryBus.execute(new ListAuditLogsQuery());
  }

  @Post("/users")
  @PermissionRequired(PERMISSIONS.usersManage)
  async createUser(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid user data", issues: parsed.error.flatten() });
    try { return reply.code(201).send(await this.commandBus.execute(new CreateUserCommand(parsed.data))); }
    catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  @Patch("/users/:id")
  @PermissionRequired(PERMISSIONS.usersManage)
  async updateUser(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid user data", issues: parsed.error.flatten() });
    try {
      const user = await this.commandBus.execute(new UpdateUserCommand(id, parsed.data));
      return user ? user : reply.code(404).send({ message: "User not found" });
    } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  @Get("/admin/config/repair-statuses")
  @PermissionRequired(PERMISSIONS.usersManage)
  async listRepairStatuses(): Promise<{ values: readonly string[] }> {
    return { values: await this.adminConfigService.listRepairStatuses() };
  }

  @Post("/admin/config/repair-statuses")
  @PermissionRequired(PERMISSIONS.usersManage)
  async addRepairStatus(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = configValueSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid configuration value" });
    await this.adminConfigService.addRepairStatus(parsed.data.value);
    return reply.code(201).send({ values: await this.adminConfigService.listRepairStatuses() });
  }

  @Post("/admin/config/repair-statuses/remove")
  @PermissionRequired(PERMISSIONS.usersManage)
  async removeRepairStatus(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = configValueSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid configuration value" });
    await this.adminConfigService.removeRepairStatus(parsed.data.value);
    return reply.code(200).send({ values: await this.adminConfigService.listRepairStatuses() });
  }

  @Get("/admin/config/device-types")
  @PermissionRequired(PERMISSIONS.usersManage)
  async listDeviceTypes(): Promise<{ values: readonly string[] }> {
    return { values: await this.adminConfigService.listDeviceTypes() };
  }

  @Post("/admin/config/device-types")
  @PermissionRequired(PERMISSIONS.usersManage)
  async addDeviceType(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = configValueSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid configuration value" });
    await this.adminConfigService.addDeviceType(parsed.data.value);
    return reply.code(201).send({ values: await this.adminConfigService.listDeviceTypes() });
  }

  @Post("/admin/config/device-types/remove")
  @PermissionRequired(PERMISSIONS.usersManage)
  async removeDeviceType(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = configValueSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid configuration value" });
    await this.adminConfigService.removeDeviceType(parsed.data.value);
    return reply.code(200).send({ values: await this.adminConfigService.listDeviceTypes() });
  }

  @Get("/admin/config/notification-templates")
  @PermissionRequired(PERMISSIONS.usersManage)
  async listNotificationTemplates(): Promise<{ values: readonly string[] }> {
    return { values: await this.adminConfigService.listNotificationTemplates() };
  }

  @Post("/admin/config/notification-templates")
  @PermissionRequired(PERMISSIONS.usersManage)
  async addNotificationTemplate(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = configValueSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid configuration value" });
    await this.adminConfigService.addNotificationTemplate(parsed.data.value);
    return reply.code(201).send({ values: await this.adminConfigService.listNotificationTemplates() });
  }

  @Post("/admin/config/notification-templates/remove")
  @PermissionRequired(PERMISSIONS.usersManage)
  async removeNotificationTemplate(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = configValueSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid configuration value" });
    await this.adminConfigService.removeNotificationTemplate(parsed.data.value);
    return reply.code(200).send({ values: await this.adminConfigService.listNotificationTemplates() });
  }

  @Get("/technicians")
  @PermissionRequired(PERMISSIONS.repairsManage)
  listTechnicians(): Promise<unknown> {
    return this.queryBus.execute(new ListTechniciansQuery());
  }
}