import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairAttachment } from "../domain/repair-attachment.js";
import type { RepairAttachmentRepository } from "./repair-attachment-repository.js";
import type { AttachmentStorage } from "./attachment-storage.js";

export interface AttachmentDownload {
  attachment: RepairAttachment;
  buffer: Buffer;
}

@Traceable("GetRepairAttachment")
@Service()
export class GetRepairAttachment {
  constructor(
    @Qualifier("repairAttachmentRepository") private readonly attachmentRepository: RepairAttachmentRepository,
    @Qualifier("attachmentStorage") private readonly storage: AttachmentStorage
  ) {}

  async execute(attachmentId: string): Promise<AttachmentDownload | undefined> {
    const attachment = await this.attachmentRepository.findById(attachmentId);
    if (!attachment) return undefined;
    const chunks: Buffer[] = [];
    for await (const chunk of this.storage.read(attachment.storageKey)) chunks.push(chunk as Buffer);
    return { attachment, buffer: Buffer.concat(chunks) };
  }
}
