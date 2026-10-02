import type { FastifyRequest } from "fastify";
import { Body, Controller, Get, Param, Patch, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { CompleteTradeInRequestCommand, GetTradeInRequestQuery, ListTradeInRequestsQuery, ProposeTradeInRequestCommand, ReviewTradeInRequestCommand } from "../../application/cqrs/ecommerce-messages.js";
import { TradeInTransitionError } from "../../application/trade-in-service.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import { GetEcommerceAttachmentQuery, ListEcommerceAttachmentsQuery } from "../../../attachments/application/cqrs/attachment-messages.js";

const statusSchema = z.enum(["submitted", "in_review", "proposal_sent", "accepted", "rejected", "completed", "cancelled"]);
const listQuerySchema = z.object({ status: statusSchema.optional() });
const proposalSchema = z.object({ proposedAmountCents: z.number().int().nonnegative().max(100000000), proposalNote: z.string().trim().max(5000).optional() });
const completeSchema = z.object({ finalAmountCents: z.number().int().nonnegative().max(100000000), method: z.enum(["bank_transfer", "cash"]), reference: z.string().trim().max(180).optional() });
type ControllerReply = { code(statusCode: number): ControllerReply; header(name: string, value: string): ControllerReply; send(payload: unknown): unknown };

@Authenticated()
@Controller("/api/trade-in-requests")
@PermissionRequired(PERMISSIONS.tradeInManage)
export class TradeInManagementController {
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus) {}
  @Get() list(@Req() request: FastifyRequest): Promise<unknown> { const parsed = listQuerySchema.safeParse(request.query); return this.queryBus.execute(new ListTradeInRequestsQuery(parsed.success ? parsed.data.status : undefined)); }
  @Get("/:id") async get(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> { const request = await this.queryBus.execute(new GetTradeInRequestQuery(id)); return request ?? reply.code(404).send({ message: "Trade-in request not found" }); }
  @Get("/:id/attachments") async listAttachments(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> { const request = await this.queryBus.execute(new GetTradeInRequestQuery(id)); return request ? this.queryBus.execute(new ListEcommerceAttachmentsQuery("trade_in_request", id)) : reply.code(404).send({ message: "Trade-in request not found" }); }
  @Get("/:id/attachments/:attachmentId") async downloadAttachment(@Param("id") id: string, @Param("attachmentId") attachmentId: string, @Res() reply: ControllerReply): Promise<unknown> { const download = await this.queryBus.execute(new GetEcommerceAttachmentQuery("trade_in_request", id, attachmentId)); if (!download) return reply.code(404).send({ message: "Attachment not found" }); reply.header("content-type", download.attachment.mimeType); reply.header("content-disposition", `inline; filename="${encodeURIComponent(download.attachment.fileName)}"`); return reply.send(download.buffer); }
  @Patch("/:id/review") async review(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> { return this.execute(() => this.commandBus.execute(new ReviewTradeInRequestCommand(id)), reply); }
  @Patch("/:id/propose") async propose(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> { const parsed = proposalSchema.safeParse(body); return parsed.success ? this.execute(() => this.commandBus.execute(new ProposeTradeInRequestCommand(id, parsed.data.proposedAmountCents, parsed.data.proposalNote)), reply) : reply.code(400).send({ message: "Invalid proposal", issues: parsed.error.flatten() }); }
  @Patch("/:id/complete") async complete(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> { const parsed = completeSchema.safeParse(body); return parsed.success ? this.execute(() => this.commandBus.execute(new CompleteTradeInRequestCommand(id, parsed.data.finalAmountCents, parsed.data.method, parsed.data.reference)), reply) : reply.code(400).send({ message: "Invalid completion", issues: parsed.error.flatten() }); }
  private async execute(operation: () => Promise<unknown>, reply: ControllerReply): Promise<unknown> { try { const result = await operation(); return result ?? reply.code(404).send({ message: "Trade-in request not found" }); } catch (error) { if (error instanceof TradeInTransitionError) return reply.code(409).send({ message: error.message }); throw error; } }
}
