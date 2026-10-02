import type { FastifyRequest } from "fastify";
import { Controller, Get, Param, Post, Delete, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import {
  DeleteRepairAttachmentCommand,
  GetRepairAttachmentQuery,
  ListRepairAttachmentsQuery,
  UploadRepairAttachmentCommand
} from "../../application/cqrs/attachment-messages.js";
import { isAllowedAttachmentMimeType, type AttachmentUploaderRole } from "../../domain/repair-attachment.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";
import { GetRepairOrderQuery } from "../../../repairs/application/cqrs/repair-messages.js";

const idSchema = z.string().uuid();

type ControllerReply = { code(statusCode: number): ControllerReply; header(name: string, value: string): ControllerReply; send(payload: unknown): unknown };

@Authenticated()
@Controller("/api/repairs")
export class AttachmentController {
  constructor(
    @InjectCommandBus() private readonly commandBus: CommandBus,
    @InjectQueryBus() private readonly queryBus: QueryBus
  ) {}

  private async canAccessRepair(request: FastifyRequest, repairOrderId: string): Promise<boolean> {
    const user = request.user as AuthTokenPayload;
    if (user.role !== "technician") return true;
    if (!user.storeId) return false;
    const repair = await this.queryBus.execute(new GetRepairOrderQuery(repairOrderId));
    return repair?.storeId === user.storeId;
  }

  @Get("/:id/attachments")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async listAttachments(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!await this.canAccessRepair(request, id)) return reply.code(404).send({ message: "Repair order not found" });
    return this.queryBus.execute(new ListRepairAttachmentsQuery(id));
  }

  @Post("/:id/attachments")
  @PermissionRequired(PERMISSIONS.repairsManage)
  async uploadAttachment(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!idSchema.safeParse(id).success) return reply.code(400).send({ message: "Invalid repair order id" });
    if (!await this.canAccessRepair(request, id)) return reply.code(404).send({ message: "Repair order not found" });
    const upload = await request.file();
    if (!upload) return reply.code(400).send({ message: "No file provided" });
    if (!isAllowedAttachmentMimeType(upload.mimetype)) return reply.code(400).send({ message: "Unsupported file type" });

    const user = request.user as AuthTokenPayload;
    const repairStepId = (upload.fields.repairStepId as { value?: unknown } | undefined)?.value;
    if (repairStepId !== undefined && (typeof repairStepId !== "string" || !idSchema.safeParse(repairStepId).success)) {
      return reply.code(400).send({ message: "Invalid repair step id" });
    }
    try {
      const attachment = await this.commandBus.execute(
        new UploadRepairAttachmentCommand(id, user.sub, user.role as AttachmentUploaderRole, upload.filename, upload.mimetype, upload.file, repairStepId)
      );
      return attachment ? reply.code(201).send(attachment) : reply.code(404).send({ message: "Repair order not found" });
    } catch (error) {
      return reply.code(400).send({ message: (error as Error).message });
    }
  }

  @Get("/:id/attachments/:attachmentId")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async downloadAttachment(@Param("id") id: string, @Param("attachmentId") attachmentId: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!await this.canAccessRepair(request, id)) return reply.code(404).send({ message: "Attachment not found" });
    const download = await this.queryBus.execute(new GetRepairAttachmentQuery(attachmentId));
    if (!download || download.repairOrderId !== id) return reply.code(404).send({ message: "Attachment not found" });
    reply.header("content-type", download.attachment.mimeType);
    reply.header("content-disposition", `inline; filename="${encodeURIComponent(download.attachment.fileName)}"`);
    return reply.send(download.buffer);
  }

  @Delete("/:id/attachments/:attachmentId")
  @PermissionRequired(PERMISSIONS.repairsManage)
  async deleteAttachment(@Param("id") id: string, @Param("attachmentId") attachmentId: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!await this.canAccessRepair(request, id)) return reply.code(404).send({ message: "Attachment not found" });
    const deleted = await this.commandBus.execute(new DeleteRepairAttachmentCommand(attachmentId));
    return deleted ? reply.code(204).send(undefined) : reply.code(404).send({ message: "Attachment not found" });
  }

}
