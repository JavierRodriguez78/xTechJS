import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { Readable } from "node:stream";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { isAllowedAttachmentMimeType, type AttachmentUploaderRole, type RepairAttachment } from "../domain/repair-attachment.js";
import type { RepairAttachmentRepository } from "./repair-attachment-repository.js";
import type { AttachmentStorage } from "./attachment-storage.js";
import type { RepairOrderRepository } from "../../repairs/application/repair-order-repository.js";

export interface UploadRepairAttachmentInput {
  repairOrderId: string;
  uploaderId: string;
  uploaderRole: AttachmentUploaderRole;
  fileName: string;
  mimeType: string;
  stream: Readable;
}

@Traceable("UploadRepairAttachment")
@Service()
export class UploadRepairAttachment {
  constructor(
    @Qualifier("repairAttachmentRepository") private readonly attachmentRepository: RepairAttachmentRepository,
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    @Qualifier("attachmentStorage") private readonly storage: AttachmentStorage
  ) {}

  async execute(input: UploadRepairAttachmentInput): Promise<RepairAttachment | undefined> {
    if (!isAllowedAttachmentMimeType(input.mimeType)) throw new Error("Unsupported file type");
    const repair = await this.repairOrderRepository.findById(input.repairOrderId);
    if (!repair) return undefined;

    const storageKey = `${input.repairOrderId}/${randomUUID()}${extname(input.fileName).toLowerCase()}`;
    const sizeBytes = await this.storage.save(storageKey, input.stream);
    return this.attachmentRepository.create({
      id: randomUUID(),
      repairOrderId: input.repairOrderId,
      uploaderId: input.uploaderId,
      uploaderRole: input.uploaderRole,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes,
      storageKey
    });
  }
}
