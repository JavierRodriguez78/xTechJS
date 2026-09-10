import type { FastifyRequest } from "fastify";
import { Controller, Get, Param, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { ApproveCustomerRepairQuoteCommand, GetOwnCustomerQuoteQuery, ListOwnCustomerRepairsQuery } from "../../application/cqrs/repair-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };

@Authenticated()
@Controller("/api/customer/repairs")
export class CustomerRepairController {
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get()
  @PermissionRequired(PERMISSIONS.repairsRead)
  async listOwnRepairs(@Req() request: FastifyRequest): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    return this.queryBus.execute(new ListOwnCustomerRepairsQuery(user.email ?? ""));
  }

  @Get("/:id/quote")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async getOwnQuote(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    const quote = await this.queryBus.execute(new GetOwnCustomerQuoteQuery(id, user.email ?? ""));
    return quote ? quote : reply.code(404).send({ message: "Repair quote not found" });
  }

  @Post("/:id/quote/approve")
  @PermissionRequired(PERMISSIONS.repairsApproveQuote)
  async approveQuote(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    if (!user.email) return reply.code(403).send({ message: "Customer identity is incomplete" });
    const quote = await this.commandBus.execute(new ApproveCustomerRepairQuoteCommand(id, user.email));
    return quote ? quote : reply.code(404).send({ message: "Repair quote not found" });
  }
}