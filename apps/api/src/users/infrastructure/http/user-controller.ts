import { Body, Controller, Get, Param, Patch, Post, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { REPAIR_STATUSES } from "../../../repairs/domain/repair-status.js";
import { CreateUserCommand, ListAuditLogsQuery, ListTechniciansQuery, ListUsersQuery, UpdateUserCommand } from "../../application/cqrs/user-messages.js";
import { PERMISSIONS } from "../../domain/permission.js";
import { PermissionRequired } from "./permission-guard.js";

type ControllerReply = { code(statusCode: number): ControllerReply; send(payload: unknown): unknown };
const userSchema = z.object({ email: z.string().trim().email().max(320), displayName: z.string().trim().min(1).max(160), role: z.enum(["admin", "technician", "customer"]), password: z.string().min(12).max(256) });
const updateUserSchema = userSchema.partial().extend({ active: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0, "At least one field is required");

@Authenticated()
@Controller("/api")
export class UserController {
  constructor(@InjectQueryBus() private readonly queryBus: QueryBus, @InjectCommandBus() private readonly commandBus: CommandBus) {}

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
  listRepairStatuses(): { values: readonly string[] } {
    return { values: REPAIR_STATUSES };
  }

  @Get("/admin/config/device-types")
  @PermissionRequired(PERMISSIONS.usersManage)
  listDeviceTypes(): { values: readonly string[] } {
    return {
      values: ["Consola", "Móvil", "Portátil", "Televisor", "Electrodoméstico", "Audio", "Accesorio", "Otros"]
    };
  }

  @Get("/technicians")
  @PermissionRequired(PERMISSIONS.repairsManage)
  listTechnicians(): Promise<unknown> {
    return this.queryBus.execute(new ListTechniciansQuery());
  }
}