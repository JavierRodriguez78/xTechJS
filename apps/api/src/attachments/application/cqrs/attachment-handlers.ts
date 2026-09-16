import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { RepairAttachment } from "../../domain/repair-attachment.js";
import { UploadRepairAttachment } from "../upload-repair-attachment.js";
import { DeleteRepairAttachment } from "../delete-repair-attachment.js";
import { ListRepairAttachments } from "../list-repair-attachments.js";
import { ListOwnCustomerRepairAttachments } from "../list-own-customer-repair-attachments.js";
import { GetRepairAttachment, type AttachmentDownload } from "../get-repair-attachment.js";
import { GetOwnCustomerRepairAttachment } from "../get-own-customer-repair-attachment.js";
import {
  DeleteRepairAttachmentCommand,
  GetOwnCustomerRepairAttachmentQuery,
  GetRepairAttachmentQuery,
  ListOwnCustomerRepairAttachmentsQuery,
  ListRepairAttachmentsQuery,
  UploadRepairAttachmentCommand
} from "./attachment-messages.js";

@Service()
@CommandHandler(UploadRepairAttachmentCommand)
export class UploadRepairAttachmentHandler implements ICommandHandler<UploadRepairAttachmentCommand, RepairAttachment | undefined> {
  constructor(private readonly useCase: UploadRepairAttachment) {}

  execute(command: UploadRepairAttachmentCommand): Promise<RepairAttachment | undefined> {
    return this.useCase.execute({
      repairOrderId: command.repairOrderId,
      uploaderId: command.uploaderId,
      uploaderRole: command.uploaderRole,
      fileName: command.fileName,
      mimeType: command.mimeType,
      stream: command.stream
    });
  }
}

@Service()
@CommandHandler(DeleteRepairAttachmentCommand)
export class DeleteRepairAttachmentHandler implements ICommandHandler<DeleteRepairAttachmentCommand, boolean> {
  constructor(private readonly useCase: DeleteRepairAttachment) {}

  execute(command: DeleteRepairAttachmentCommand): Promise<boolean> {
    return this.useCase.execute(command.attachmentId);
  }
}

@Service()
@QueryHandler(ListRepairAttachmentsQuery)
export class ListRepairAttachmentsHandler implements IQueryHandler<ListRepairAttachmentsQuery, readonly RepairAttachment[]> {
  constructor(private readonly useCase: ListRepairAttachments) {}

  execute(query: ListRepairAttachmentsQuery): Promise<readonly RepairAttachment[]> {
    return this.useCase.execute(query.repairOrderId);
  }
}

@Service()
@QueryHandler(ListOwnCustomerRepairAttachmentsQuery)
export class ListOwnCustomerRepairAttachmentsHandler implements IQueryHandler<ListOwnCustomerRepairAttachmentsQuery, readonly RepairAttachment[] | undefined> {
  constructor(private readonly useCase: ListOwnCustomerRepairAttachments) {}

  execute(query: ListOwnCustomerRepairAttachmentsQuery): Promise<readonly RepairAttachment[] | undefined> {
    return this.useCase.execute(query.repairOrderId, query.email);
  }
}

@Service()
@QueryHandler(GetRepairAttachmentQuery)
export class GetRepairAttachmentHandler implements IQueryHandler<GetRepairAttachmentQuery, AttachmentDownload | undefined> {
  constructor(private readonly useCase: GetRepairAttachment) {}

  execute(query: GetRepairAttachmentQuery): Promise<AttachmentDownload | undefined> {
    return this.useCase.execute(query.attachmentId);
  }
}

@Service()
@QueryHandler(GetOwnCustomerRepairAttachmentQuery)
export class GetOwnCustomerRepairAttachmentHandler implements IQueryHandler<GetOwnCustomerRepairAttachmentQuery, AttachmentDownload | undefined> {
  constructor(private readonly useCase: GetOwnCustomerRepairAttachment) {}

  execute(query: GetOwnCustomerRepairAttachmentQuery): Promise<AttachmentDownload | undefined> {
    return this.useCase.execute(query.repairOrderId, query.attachmentId, query.email);
  }
}
