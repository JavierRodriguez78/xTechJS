import type { FastifyRequest } from "fastify";
import { Body, Controller, Get, Param, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { ListChatMessagesQuery, SendChatMessageCommand } from "../../application/cqrs/chat-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";
import type { ChatSenderRole } from "../../domain/chat-message.js";
import { canAccessStore, getStoreAccess } from "../../../users/domain/store-access.js";
import { GetRepairOrderQuery } from "../../../repairs/application/cqrs/repair-messages.js";

const sendMessageSchema = z.object({ body: z.string().trim().min(1).max(2000) });

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };

@Authenticated()
@Controller("/api/repairs")
export class ChatController {
  constructor(
    @InjectCommandBus() private readonly commandBus: CommandBus,
    @InjectQueryBus() private readonly queryBus: QueryBus
  ) {}

  private async canAccessRepair(user: AuthTokenPayload, repairOrderId: string): Promise<boolean> {
    if (user.role === "customer") return false;
    const access = getStoreAccess(user);
    if (access === null) return true;
    if (!access.length) return false;
    const repair = await this.queryBus.execute(new GetRepairOrderQuery(repairOrderId));
    return Boolean(repair && canAccessStore(user, repair.storeId));
  }

  @Get("/:id/messages")
  @PermissionRequired(PERMISSIONS.chatUse)
  async listMessages(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!await this.canAccessRepair(request.user as AuthTokenPayload, id)) return reply.code(404).send({ message: "Repair order not found" });
    return this.queryBus.execute(new ListChatMessagesQuery(id));
  }

  @Post("/:id/messages")
  @PermissionRequired(PERMISSIONS.chatUse)
  async sendMessage(@Param("id") id: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid chat message", issues: parsed.error.flatten() });
    const user = request.user as AuthTokenPayload;
    if (!await this.canAccessRepair(user, id)) return reply.code(404).send({ message: "Repair order not found" });
    const message = await this.commandBus.execute(new SendChatMessageCommand(id, user.sub, user.role as ChatSenderRole, user.email ?? user.sub, parsed.data.body));
    return message ? reply.code(201).send(message) : reply.code(404).send({ message: "Repair order not found" });
  }
}
