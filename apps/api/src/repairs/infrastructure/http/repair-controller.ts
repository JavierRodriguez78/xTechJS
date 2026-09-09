import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import type { CreateRepairOrderInput, UpdateRepairTechnicalInput } from "../../domain/repair-order.js";
import type { RepairStatus } from "../../domain/repair-status.js";
import type { SaveRepairQuoteInput } from "../../domain/repair-quote.js";
import {
  ApproveRepairQuoteCommand,
  ChangeRepairStatusCommand,
  CreateRepairOrderCommand,
  GetRepairQuoteQuery,
  GetRepairStatusHistoryQuery,
  ListRepairOrdersQuery,
  SaveRepairQuoteCommand,
  UpdateRepairTechnicalCommand
} from "../../application/cqrs/repair-messages.js";
import { REPAIR_STATUSES } from "../../domain/repair-status.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { requireControllerPermission } from "../../../users/infrastructure/http/auth-routes.js";

const createSchema = z.object({ customerId: z.string().uuid(), deviceType: z.string().trim().min(1).max(100), brand: z.string().trim().min(1).max(100), model: z.string().trim().min(1).max(160), serialNumber: z.string().trim().max(160).optional(), reportedIssue: z.string().trim().min(1).max(5000), deliveredAccessories: z.string().trim().max(2000).optional() });
const statusSchema = z.object({ status: z.enum(REPAIR_STATUSES), note: z.string().trim().max(2000).optional() });
const technicalSchema = z.object({ technicianId: z.string().uuid().optional(), diagnosis: z.string().trim().max(5000).optional() }).refine((input) => Object.keys(input).length > 0, "At least one technical field is required");
const quoteSchema = z.object({ status: z.enum(["draft", "sent"]), lines: z.array(z.object({ description: z.string().trim().min(1).max(500), quantity: z.number().int().min(1).max(1000), unitPriceCents: z.number().int().min(0).max(100000000) })).min(1).max(50) });

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };

@Authenticated()
@Controller("/api/repairs")
export class RepairController {
  constructor(
    @InjectCommandBus() private readonly commandBus: CommandBus,
    @InjectQueryBus() private readonly queryBus: QueryBus
  ) {}

  @Get()
  @UseGuards(requireControllerPermission(PERMISSIONS.repairsRead))
  listRepairs(): Promise<unknown> {
    return this.queryBus.execute(new ListRepairOrdersQuery());
  }

  @Get("/:id/history")
  @UseGuards(requireControllerPermission(PERMISSIONS.repairsRead))
  async getHistory(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const history = await this.queryBus.execute(new GetRepairStatusHistoryQuery(id));
    return history.length ? history : reply.code(404).send({ message: "Repair order not found" });
  }

  @Post()
  @UseGuards(requireControllerPermission(PERMISSIONS.repairsManage))
  async createRepair(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair order", issues: parsed.error.flatten() });
    return reply.code(201).send(await this.commandBus.execute(new CreateRepairOrderCommand(parsed.data as CreateRepairOrderInput)));
  }

  @Patch("/:id/status")
  @UseGuards(requireControllerPermission(PERMISSIONS.repairsManage))
  async changeStatus(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair status", issues: parsed.error.flatten() });
    try {
      const repair = await this.commandBus.execute(new ChangeRepairStatusCommand(id, parsed.data.status as RepairStatus, parsed.data.note));
      return repair ?? reply.code(404).send({ message: "Repair order not found" });
    } catch (error) {
      return reply.code(409).send({ message: (error as Error).message });
    }
  }

  @Patch("/:id/technical")
  @UseGuards(requireControllerPermission(PERMISSIONS.repairsManage))
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
  @UseGuards(requireControllerPermission(PERMISSIONS.repairsRead))
  async getQuote(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const quote = await this.queryBus.execute(new GetRepairQuoteQuery(id));
    return quote ?? reply.code(404).send({ message: "Repair quote not found" });
  }

  @Patch("/:id/quote")
  @UseGuards(requireControllerPermission(PERMISSIONS.repairsManage))
  async saveQuote(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair quote", issues: parsed.error.flatten() });
    const quote = await this.commandBus.execute(new SaveRepairQuoteCommand(id, parsed.data as SaveRepairQuoteInput));
    return quote ? quote : reply.code(404).send({ message: "Repair order not found" });
  }

  @Post("/:id/quote/approve")
  @UseGuards(requireControllerPermission(PERMISSIONS.repairsManage))
  async approveQuote(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    try {
      const quote = await this.commandBus.execute(new ApproveRepairQuoteCommand(id));
      return quote ?? reply.code(404).send({ message: "Repair quote not found" });
    } catch (error) {
      return reply.code(409).send({ message: (error as Error).message });
    }
  }
}
