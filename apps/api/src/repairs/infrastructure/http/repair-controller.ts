import type { FastifyRequest } from "fastify";
import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import type { CreateRepairOrderInput, UpdateRepairTechnicalInput } from "../../domain/repair-order.js";
import type { RepairStatus } from "../../domain/repair-status.js";
import type { SaveRepairQuoteInput } from "../../domain/repair-quote.js";
import {
  ApproveRepairQuoteCommand,
  AddRepairStepCommand,
  ChangeRepairStatusCommand,
  CreateRepairOrderCommand,
  GetRepairOrderQuery,
  GetRepairQuoteQuery,
  GetRepairTechnicalReportQuery,
  GetRepairStatusHistoryQuery,
  GetRepairWorkflowConfigQuery,
  ListRepairStepsQuery,
  ListRepairOrdersQuery,
  SaveRepairQuoteCommand,
  UpdateRepairStepCommand,
  UpdateRepairTechnicalCommand
} from "../../application/cqrs/repair-messages.js";
import { DeleteRepairStepCommand } from "../../application/cqrs/repair-messages.js";
import { RepairStepAccessDeniedError } from "../../application/manage-repair-step.js";
import { DeviceTypeNotConfiguredError } from "../../domain/device-type.js";
import { RepairStatusNotConfiguredError } from "../../domain/repair-status.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";

const createSchema = z.object({ customerId: z.string().uuid(), deviceType: z.string().trim().min(1).max(100), brand: z.string().trim().min(1).max(100), model: z.string().trim().min(1).max(160), serialNumber: z.string().trim().max(160).optional(), reportedIssue: z.string().trim().min(1).max(5000), deliveredAccessories: z.string().trim().max(2000).optional() });
// El estado no se valida contra una lista fija: los estados activos los define la
// configuracion administrativa y el caso de uso los comprueba contra ella.
const statusSchema = z.object({ status: z.string().trim().min(1).max(160), note: z.string().trim().max(2000).optional() });
const technicalSchema = z.object({ technicianId: z.string().uuid().optional(), diagnosis: z.string().trim().max(5000).optional() }).refine((input) => Object.keys(input).length > 0, "At least one technical field is required");
const quoteSchema = z.object({ status: z.enum(["draft", "sent"]), lines: z.array(z.object({ description: z.string().trim().min(1).max(500), quantity: z.number().int().min(1).max(1000), unitPriceCents: z.number().int().min(0).max(100000000) })).min(1).max(50) });
const repairStepSchema = z.object({ title: z.string().trim().min(1).max(200), description: z.string().trim().max(10000).optional(), performedAt: z.coerce.date().optional() });
const repairStepUpdateSchema = repairStepSchema.partial().refine((input) => Object.keys(input).length > 0, "At least one repair step field is required");
const listRepairsQuerySchema = z.object({
  q: z.string().trim().min(1).max(160).optional(),
  estado: z.string().trim().min(1).max(160).optional(),
  tecnico: z.string().uuid().optional(),
  tipo: z.string().trim().min(1).max(100).optional(),
  cliente: z.string().uuid().optional(),
  desde: z.string().date().optional(),
  hasta: z.string().date().optional(),
  orden: z.enum(["createdAt:asc", "createdAt:desc", "brand:asc", "brand:desc"]).default("createdAt:desc"),
  pagina: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

type ControllerReply = { code(statusCode: number): ControllerReply; header(name: string, value: string): ControllerReply; send(payload: unknown): unknown };

@Authenticated()
@Controller("/api/repairs")
export class RepairController {
  constructor(
    @InjectCommandBus() private readonly commandBus: CommandBus,
    @InjectQueryBus() private readonly queryBus: QueryBus
  ) {}

  @Get()
  @PermissionRequired(PERMISSIONS.repairsRead)
  async listRepairs(@Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = listRepairsQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair list query", issues: parsed.error.flatten() });
    const { q, estado, tecnico, tipo, cliente, desde, hasta, orden, pagina, pageSize } = parsed.data;
    const receivedTo = hasta ? new Date(`${hasta}T00:00:00.000Z`) : undefined;
    if (receivedTo) receivedTo.setUTCDate(receivedTo.getUTCDate() + 1);
    return this.queryBus.execute(new ListRepairOrdersQuery({
      query: q,
      status: estado,
      technicianId: tecnico,
      deviceType: tipo,
      customerId: cliente,
      receivedFrom: desde ? new Date(`${desde}T00:00:00.000Z`) : undefined,
      receivedTo,
      sort: orden,
      page: pagina,
      pageSize
    }));
  }

  @Get("/config")
  @PermissionRequired(PERMISSIONS.repairsRead)
  getWorkflowConfig(): Promise<unknown> {
    return this.queryBus.execute(new GetRepairWorkflowConfigQuery());
  }

  @Get("/:id")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async getRepair(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const repair = await this.queryBus.execute(new GetRepairOrderQuery(id));
    return repair ?? reply.code(404).send({ message: "Repair order not found" });
  }

  @Get("/:id/report")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async downloadTechnicalReport(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const document = await this.queryBus.execute(new GetRepairTechnicalReportQuery(id));
    if (!document) return reply.code(404).send({ message: "Repair order not found" });
    reply.header("content-type", "application/pdf");
    reply.header("content-disposition", `attachment; filename="informe-tecnico-${id.slice(0, 8)}.pdf"`);
    return reply.send(document);
  }

  @Get("/:id/steps")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async listSteps(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const steps = await this.queryBus.execute(new ListRepairStepsQuery(id));
    return steps ?? reply.code(404).send({ message: "Repair order not found" });
  }

  @Post("/:id/steps")
  @PermissionRequired(PERMISSIONS.repairsManage)
  async addStep(@Param("id") id: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = repairStepSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair step", issues: parsed.error.flatten() });
    const user = request.user as AuthTokenPayload;
    const step = await this.commandBus.execute(new AddRepairStepCommand(id, user.sub, parsed.data));
    return step ? reply.code(201).send(step) : reply.code(404).send({ message: "Repair order not found" });
  }

  @Patch("/:id/steps/:stepId")
  @PermissionRequired(PERMISSIONS.repairsManage)
  async updateStep(@Param("id") id: string, @Param("stepId") stepId: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = repairStepUpdateSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair step", issues: parsed.error.flatten() });
    const user = request.user as AuthTokenPayload;
    try {
      const step = await this.commandBus.execute(new UpdateRepairStepCommand(id, stepId, user.sub, user.role, parsed.data));
      return step ?? reply.code(404).send({ message: "Repair step not found" });
    } catch (error) {
      if (error instanceof RepairStepAccessDeniedError) return reply.code(403).send({ message: error.message });
      throw error;
    }
  }

  @Delete("/:id/steps/:stepId")
  @PermissionRequired(PERMISSIONS.repairsManage)
  async deleteStep(@Param("id") id: string, @Param("stepId") stepId: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    try {
      const deleted = await this.commandBus.execute(new DeleteRepairStepCommand(id, stepId, user.sub, user.role));
      return deleted ? reply.code(204).send(undefined) : reply.code(404).send({ message: "Repair step not found" });
    } catch (error) {
      if (error instanceof RepairStepAccessDeniedError) return reply.code(403).send({ message: error.message });
      throw error;
    }
  }

  @Get("/:id/history")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async getHistory(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const history = await this.queryBus.execute(new GetRepairStatusHistoryQuery(id));
    return history.length ? history : reply.code(404).send({ message: "Repair order not found" });
  }

  @Post()
  @PermissionRequired(PERMISSIONS.repairsManage)
  async createRepair(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair order", issues: parsed.error.flatten() });
    try {
      return reply.code(201).send(await this.commandBus.execute(new CreateRepairOrderCommand(parsed.data as CreateRepairOrderInput)));
    } catch (error) {
      if (error instanceof DeviceTypeNotConfiguredError) return reply.code(400).send({ message: `El tipo de dispositivo "${error.deviceType}" no esta configurado.` });
      throw error;
    }
  }

  @Patch("/:id/status")
  @PermissionRequired(PERMISSIONS.repairsManage)
  async changeStatus(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair status", issues: parsed.error.flatten() });
    try {
      const repair = await this.commandBus.execute(new ChangeRepairStatusCommand(id, parsed.data.status as RepairStatus, parsed.data.note));
      return repair ?? reply.code(404).send({ message: "Repair order not found" });
    } catch (error) {
      if (error instanceof RepairStatusNotConfiguredError) return reply.code(400).send({ message: `El estado "${error.status}" no esta configurado.` });
      return reply.code(409).send({ message: (error as Error).message });
    }
  }

  @Patch("/:id/technical")
  @PermissionRequired(PERMISSIONS.repairsManage)
  async updateTechnical(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = technicalSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid technical details", issues: parsed.error.flatten() });
    try {
      const repair = await this.commandBus.execute(new UpdateRepairTechnicalCommand(id, parsed.data as UpdateRepairTechnicalInput));
      return repair ?? reply.code(404).send({ message: "Repair order not found" });
    } catch (error) {
      return reply.code(400).send({ message: (error as Error).message });
    }
  }

  @Get("/:id/quote")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async getQuote(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const quote = await this.queryBus.execute(new GetRepairQuoteQuery(id));
    return quote ?? reply.code(404).send({ message: "Repair quote not found" });
  }

  @Patch("/:id/quote")
  @PermissionRequired(PERMISSIONS.repairsManage)
  async saveQuote(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair quote", issues: parsed.error.flatten() });
    const quote = await this.commandBus.execute(new SaveRepairQuoteCommand(id, parsed.data as SaveRepairQuoteInput));
    return quote ? quote : reply.code(404).send({ message: "Repair order not found" });
  }

  @Post("/:id/quote/approve")
  @PermissionRequired(PERMISSIONS.repairsManage)
  async approveQuote(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    try {
      const quote = await this.commandBus.execute(new ApproveRepairQuoteCommand(id));
      return quote ?? reply.code(404).send({ message: "Repair quote not found" });
    } catch (error) {
      return reply.code(409).send({ message: (error as Error).message });
    }
  }
}
