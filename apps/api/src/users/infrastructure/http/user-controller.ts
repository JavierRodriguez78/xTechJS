import { Body, Controller, Get, Param, Patch, Post, Req, Res } from "@xtaskjs/common";
import type { FastifyRequest } from "fastify";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { AdminConfigService, ProtectedConfigValueError } from "../../application/admin-config.js";
import type { RepairDeviceCatalogEntry } from "../../../repairs/domain/repair-device-catalog.js";
import { CreateEmployeeCommand, CreateUserCommand, ListAuditLogsQuery, ListTechniciansQuery, ListUsersQuery, UpdateEmployeeCommand, UpdateUserCommand } from "../../application/cqrs/user-messages.js";
import type { AuthTokenPayload } from "./auth-routes.js";
import { getStoreAccess } from "../../domain/store-access.js";
import { PERMISSIONS } from "../../domain/permission.js";
import { GlobalPermissionRequired, PermissionRequired } from "./permission-guard.js";
import { UserEntitySchema } from "../persistence/user-entity.js";

type ControllerReply = { code(statusCode: number): ControllerReply; send(payload: unknown): unknown };
const userSchema = z.object({ email: z.string().trim().email().max(320), displayName: z.string().trim().min(1).max(160), role: z.enum(["admin", "technician", "customer"]), password: z.string().min(12).max(256), storeId: z.string().uuid().nullable().optional() });
const updateUserSchema = userSchema.partial().extend({ active: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0, "At least one field is required");
const configValueSchema = z.object({ value: z.string().trim().min(1).max(160) });
const repairDeviceCatalogSchema = z.object({ deviceType: z.string().trim().min(1).max(100), brand: z.string().trim().min(1).max(100), model: z.string().trim().min(1).max(160), imageUrl: z.string().trim().url().max(2000).optional() });
const employeeSchema = z.object({
  email: z.string().trim().email().max(320), displayName: z.string().trim().min(1).max(160), role: z.enum(["admin", "technician"]),
  password: z.string().min(12).max(72).refine((password) => Buffer.byteLength(password, "utf8") <= 72),
  defaultStoreId: z.string().uuid().nullable(), storeAccess: z.array(z.string().uuid()).min(1).nullable(),
  phone: z.string().trim().max(80).nullable().optional(), nationalId: z.string().trim().max(32).nullable().optional(),
  addressStreet: z.string().trim().max(500).nullable().optional(), addressPostalCode: z.string().trim().max(20).nullable().optional(),
  addressCity: z.string().trim().max(120).nullable().optional(), addressProvince: z.string().trim().max(120).nullable().optional(),
  addressCountry: z.string().trim().max(80).nullable().optional()
}).strict();
const updateEmployeeSchema = employeeSchema.omit({ password: true }).partial().extend({ password: z.string().min(12).max(72).refine((password) => Buffer.byteLength(password, "utf8") <= 72).optional(), active: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);

function employeeStoreAccess(user: { role?: string; defaultStoreId?: string | null; storeAccess?: string[] | null; storeId?: string | null }): string[] | null {
  if (user.storeAccess !== undefined) return user.storeAccess;
  const defaultStoreId = user.defaultStoreId ?? user.storeId ?? null;
  if (defaultStoreId) return [defaultStoreId];
  return user.role === "admin" ? null : [];
}

@Authenticated()
@Controller("/api")
export class UserController {
  @InjectDataSource() private readonly dataSource!: DataSource;

  constructor(
    @InjectQueryBus() private readonly queryBus: QueryBus,
    @InjectCommandBus() private readonly commandBus: CommandBus,
    private readonly adminConfigService: AdminConfigService
  ) {}

  @Get("/employees")
  @PermissionRequired(PERMISSIONS.usersManage)
  async listEmployees(@Req() request: FastifyRequest): Promise<unknown> {
    const users = await this.queryBus.execute(new ListUsersQuery());
    const access = getStoreAccess(request.user as AuthTokenPayload);
    return users.filter((user: { role: string; defaultStoreId?: string | null; storeAccess?: string[] | null; storeId?: string | null }) => {
      if (user.role !== "admin" && user.role !== "technician") return false;
      const employeeAccess = employeeStoreAccess(user);
      return access === null || Boolean(employeeAccess?.some((storeId) => access.includes(storeId)));
    });
  }

  @Get("/employees/:id/national-id")
  @PermissionRequired(PERMISSIONS.usersManage)
  async revealEmployeeNationalId(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if ((request.user as AuthTokenPayload).role !== "admin") return reply.code(403).send({ message: "Solo administracion puede consultar el DNI/NIE." });
    const user = (await this.queryBus.execute(new ListUsersQuery())).find((item: { id: string }) => item.id === id) as { id: string; role?: string; defaultStoreId?: string | null; storeAccess?: string[] | null; storeId?: string | null } | undefined;
    if (!user || (user.role !== "admin" && user.role !== "technician")) return reply.code(404).send({ message: "Empleado no encontrado." });
    const actorAccess = getStoreAccess(request.user as AuthTokenPayload);
    const targetAccess = employeeStoreAccess(user);
    if (actorAccess && (targetAccess === null || !targetAccess.some((storeId) => actorAccess.includes(storeId)))) return reply.code(404).send({ message: "Empleado no encontrado." });
    const nationalId = await this.dataSource.getRepository(UserEntitySchema).createQueryBuilder("user").addSelect("user.nationalId").where("user.id = :id", { id }).getOne();
    return { nationalId: nationalId?.nationalId ?? null };
  }

  @Post("/employees")
  @PermissionRequired(PERMISSIONS.usersManage)
  async createEmployee(@Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = employeeSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Revisa los datos del empleado.", issues: parsed.error.flatten() });
    const actor = request.user as AuthTokenPayload;
    const actorAccess = getStoreAccess(actor);
    if (actorAccess && (parsed.data.storeAccess === null || parsed.data.storeAccess.some((storeId) => !actorAccess.includes(storeId)))) return reply.code(403).send({ message: "No puedes asignar empleados a tiendas fuera de tu alcance." });
    if (!await this.validEmployeeStores(parsed.data.defaultStoreId, parsed.data.storeAccess, parsed.data.role)) return reply.code(400).send({ message: "Selecciona tiendas existentes y un alcance valido para el empleado." });
    try { return reply.code(201).send(await this.commandBus.execute(new CreateEmployeeCommand(parsed.data, actor.sub))); }
    catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  @Patch("/employees/:id")
  @PermissionRequired(PERMISSIONS.usersManage)
  async updateEmployee(@Param("id") id: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = updateEmployeeSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Revisa los datos del empleado.", issues: parsed.error.flatten() });
    const target = (await this.queryBus.execute(new ListUsersQuery())).find((user: { id: string }) => user.id === id) as { role?: string; active?: boolean; defaultStoreId?: string | null; storeAccess?: string[] | null; storeId?: string | null } | undefined;
    if (!target || (target.role !== "admin" && target.role !== "technician")) return reply.code(404).send({ message: "Empleado no encontrado." });
    const actor = request.user as AuthTokenPayload;
    const actorAccess = getStoreAccess(actor);
    const targetAccess = employeeStoreAccess(target);
    if (actorAccess && (targetAccess === null || !targetAccess.some((storeId) => actorAccess.includes(storeId)))) return reply.code(404).send({ message: "Empleado no encontrado." });
    const nextAccess = parsed.data.storeAccess !== undefined ? parsed.data.storeAccess : targetAccess;
    const nextDefault = parsed.data.defaultStoreId !== undefined ? parsed.data.defaultStoreId : target.defaultStoreId ?? target.storeId ?? null;
    if (actorAccess && (nextAccess === null || nextAccess.some((storeId) => !actorAccess.includes(storeId)) || (nextDefault !== null && !actorAccess.includes(nextDefault)))) return reply.code(403).send({ message: "No puedes asignar empleados a tiendas fuera de tu alcance." });
    if (id === actor.sub && parsed.data.active === false) return reply.code(409).send({ message: "No puedes darte de baja desde tu propia sesion." });
    if (id === actor.sub && (parsed.data.role !== undefined || parsed.data.storeAccess !== undefined || parsed.data.defaultStoreId !== undefined)) return reply.code(409).send({ message: "No puedes cambiar tu rol ni tu alcance desde tu propia sesion." });
    const defaultStoreId = parsed.data.defaultStoreId !== undefined ? parsed.data.defaultStoreId : target.defaultStoreId ?? target.storeId ?? null;
    const storeAccess = parsed.data.storeAccess !== undefined ? parsed.data.storeAccess : target.storeAccess !== undefined ? target.storeAccess : (defaultStoreId ? [defaultStoreId] : target.role === "admin" ? null : []);
    const changesStoreScope = parsed.data.role !== undefined || parsed.data.defaultStoreId !== undefined || parsed.data.storeAccess !== undefined;
    if (changesStoreScope && !await this.validEmployeeStores(defaultStoreId, storeAccess, parsed.data.role ?? target.role)) return reply.code(400).send({ message: "Selecciona tiendas existentes y un alcance valido para el empleado." });
    try {
      const employee = await this.commandBus.execute(new UpdateEmployeeCommand(id, parsed.data, actor.sub));
      return employee ?? reply.code(404).send({ message: "Empleado no encontrado." });
    } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  private async validEmployeeStores(defaultStoreId: string | null | undefined, storeAccess: string[] | null | undefined, role: string): Promise<boolean> {
    if (role === "technician" && (!storeAccess?.length || !defaultStoreId || !storeAccess.includes(defaultStoreId))) return false;
    if (role === "admin" && storeAccess !== null && (!storeAccess?.length || !defaultStoreId || !storeAccess.includes(defaultStoreId))) return false;
    const ids = [...new Set([...(storeAccess ?? []), ...(defaultStoreId ? [defaultStoreId] : [])])];
    if (!ids.length) return role === "admin" && storeAccess === null;
    const stores: Array<{ id: string }> = await this.dataSource.query('SELECT id FROM stores WHERE active = true AND id = ANY($1::uuid[])', [ids]);
    return stores.length === ids.length;
  }

  @Get("/users")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  listUsers(): Promise<unknown> {
    return this.queryBus.execute(new ListUsersQuery());
  }

  @Get("/users/audit")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  listAuditLogs(): Promise<unknown> {
    return this.queryBus.execute(new ListAuditLogsQuery());
  }

  @Post("/users")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  async createUser(@Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Revisa los datos del empleado.", issues: parsed.error.flatten() });
    try { return reply.code(201).send(await this.commandBus.execute(new CreateUserCommand(parsed.data, (request.user as AuthTokenPayload).sub))); }
    catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  @Patch("/users/:id")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  async updateUser(@Param("id") id: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Revisa los datos del empleado.", issues: parsed.error.flatten() });
    try {
      const user = await this.commandBus.execute(new UpdateUserCommand(id, parsed.data, (request.user as AuthTokenPayload).sub));
      return user ? user : reply.code(404).send({ message: "User not found" });
    } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  @Get("/admin/config/repair-statuses")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  async listRepairStatuses(): Promise<{ values: readonly string[] }> {
    return { values: await this.adminConfigService.listRepairStatuses() };
  }

  @Post("/admin/config/repair-statuses")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  async addRepairStatus(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = configValueSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid configuration value" });
    await this.adminConfigService.addRepairStatus(parsed.data.value);
    return reply.code(201).send({ values: await this.adminConfigService.listRepairStatuses() });
  }

  @Post("/admin/config/repair-statuses/remove")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  async removeRepairStatus(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = configValueSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid configuration value" });
    try {
      await this.adminConfigService.removeRepairStatus(parsed.data.value);
    } catch (error) {
      if (error instanceof ProtectedConfigValueError) return reply.code(409).send({ message: error.message });
      throw error;
    }
    return reply.code(200).send({ values: await this.adminConfigService.listRepairStatuses() });
  }

  @Get("/admin/config/device-types")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  async listDeviceTypes(): Promise<{ values: readonly string[] }> {
    return { values: await this.adminConfigService.listDeviceTypes() };
  }

  @Post("/admin/config/device-types")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  async addDeviceType(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = configValueSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid configuration value" });
    await this.adminConfigService.addDeviceType(parsed.data.value);
    return reply.code(201).send({ values: await this.adminConfigService.listDeviceTypes() });
  }

  @Post("/admin/config/device-types/remove")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  async removeDeviceType(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = configValueSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid configuration value" });
    await this.adminConfigService.removeDeviceType(parsed.data.value);
    return reply.code(200).send({ values: await this.adminConfigService.listDeviceTypes() });
  }

  @Get("/admin/config/repair-device-catalog")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  async listRepairDeviceCatalog(): Promise<{ entries: readonly RepairDeviceCatalogEntry[] }> {
    return { entries: await this.adminConfigService.listRepairDeviceCatalog() };
  }

  @Post("/admin/config/repair-device-catalog")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  async addRepairDeviceCatalogEntry(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = repairDeviceCatalogSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair device catalog entry", issues: parsed.error.flatten() });
    await this.adminConfigService.addRepairDeviceCatalogEntry(parsed.data);
    return reply.code(201).send({ entries: await this.adminConfigService.listRepairDeviceCatalog() });
  }

  @Post("/admin/config/repair-device-catalog/remove")
  @GlobalPermissionRequired(PERMISSIONS.usersManage)
  async removeRepairDeviceCatalogEntry(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = repairDeviceCatalogSchema.pick({ deviceType: true, brand: true, model: true }).safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair device catalog entry" });
    await this.adminConfigService.removeRepairDeviceCatalogEntry(parsed.data);
    return reply.code(200).send({ entries: await this.adminConfigService.listRepairDeviceCatalog() });
  }

  @Get("/technicians")
  @PermissionRequired(PERMISSIONS.repairsManage)
  async listTechnicians(@Req() request: FastifyRequest): Promise<unknown> {
    const users = await this.queryBus.execute(new ListTechniciansQuery());
    const access = getStoreAccess(request.user as AuthTokenPayload);
    if (access === null) return users;
    return users.filter((user: { defaultStoreId?: string | null; storeAccess?: string[] | null; storeId?: string | null }) => {
      const employeeAccess = user.storeAccess !== undefined ? user.storeAccess : user.defaultStoreId ?? user.storeId ? [user.defaultStoreId ?? user.storeId!] : [];
      return Boolean(employeeAccess?.some((storeId) => access.includes(storeId)));
    });
  }
}