import { Controller, Get, Param, Req, Res } from "@xtaskjs/common";
import { InjectQueryBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import type { FastifyRequest } from "fastify";
import { GetOwnCustomerRepairAttachmentQuery, ListOwnCustomerRepairAttachmentsQuery } from "../../application/cqrs/attachment-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";

type ControllerReply = { code(statusCode: number): ControllerReply; header(name: string, value: string): ControllerReply; send(payload: unknown): unknown };

@Authenticated()
@Controller("/api/customer/repairs")
export class CustomerAttachmentController {
  constructor(@InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get("/:id/attachments")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async listOwnAttachments(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    const attachments = await this.queryBus.execute(new ListOwnCustomerRepairAttachmentsQuery(id, user.email ?? ""));
    return attachments ? attachments : reply.code(404).send({ message: "Repair order not found" });
  }

  @Get("/:id/attachments/:attachmentId")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async downloadOwnAttachment(@Param("id") id: string, @Param("attachmentId") attachmentId: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    const download = await this.queryBus.execute(new GetOwnCustomerRepairAttachmentQuery(id, attachmentId, user.email ?? ""));
    if (!download) return reply.code(404).send({ message: "Attachment not found" });
    reply.header("content-type", download.attachment.mimeType);
    reply.header("content-disposition", `inline; filename="${encodeURIComponent(download.attachment.fileName)}"`);
    return reply.send(download.buffer);
  }
}
