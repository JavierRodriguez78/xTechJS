import type { FastifyRequest } from "fastify";
import { Body, Controller, Get, Param, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { ListOwnCustomerChatMessagesQuery, SendOwnCustomerChatMessageCommand } from "../../application/cqrs/chat-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";

const sendMessageSchema = z.object({ body: z.string().trim().min(1).max(2000) });

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };

@Authenticated()
@Controller("/api/customer/repairs")
export class CustomerChatController {
  constructor(
    @InjectCommandBus() private readonly commandBus: CommandBus,
    @InjectQueryBus() private readonly queryBus: QueryBus
  ) {}

  @Get("/:id/messages")
  @PermissionRequired(PERMISSIONS.chatUse)
  async listOwnMessages(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    const messages = await this.queryBus.execute(new ListOwnCustomerChatMessagesQuery(id, user.email ?? ""));
    return messages ? messages : reply.code(404).send({ message: "Repair order not found" });
  }

  @Post("/:id/messages")
  @PermissionRequired(PERMISSIONS.chatUse)
  async sendOwnMessage(@Param("id") id: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid chat message", issues: parsed.error.flatten() });
    const user = request.user as AuthTokenPayload;
    if (!user.email) return reply.code(403).send({ message: "Customer identity is incomplete" });
    const message = await this.commandBus.execute(new SendOwnCustomerChatMessageCommand(id, user.email, parsed.data.body));
    return message ? reply.code(201).send(message) : reply.code(404).send({ message: "Repair order not found" });
  }
}
