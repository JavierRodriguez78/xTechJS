import type { Readable } from "node:stream";
import type { AttachmentUploaderRole } from "../../domain/repair-attachment.js";

export class UploadRepairAttachmentCommand {
  constructor(
    public readonly repairOrderId: string,
    public readonly uploaderId: string,
    public readonly uploaderRole: AttachmentUploaderRole,
    public readonly fileName: string,
    public readonly mimeType: string,
    public readonly stream: Readable
  ) {}
}

export class DeleteRepairAttachmentCommand {
  constructor(public readonly attachmentId: string) {}
}

export class ListRepairAttachmentsQuery {
  constructor(public readonly repairOrderId: string) {}
}

export class ListOwnCustomerRepairAttachmentsQuery {
  constructor(public readonly repairOrderId: string, public readonly email: string) {}
}

export class GetRepairAttachmentQuery {
  constructor(public readonly attachmentId: string) {}
}

export class GetOwnCustomerRepairAttachmentQuery {
  constructor(public readonly repairOrderId: string, public readonly attachmentId: string, public readonly email: string) {}
}
