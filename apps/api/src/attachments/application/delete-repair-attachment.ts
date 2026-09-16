import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairAttachmentRepository } from "./repair-attachment-repository.js";
import type { AttachmentStorage } from "./attachment-storage.js";

@Traceable("DeleteRepairAttachment")
@Service()
export class DeleteRepairAttachment {
  constructor(
    @Qualifier("repairAttachmentRepository") private readonly attachmentRepository: RepairAttachmentRepository,
    @Qualifier("attachmentStorage") private readonly storage: AttachmentStorage
  ) {}

  async execute(attachmentId: string): Promise<boolean> {
    const attachment = await this.attachmentRepository.findById(attachmentId);
    if (!attachment) return false;
    await this.storage.delete(attachment.storageKey);
    await this.attachmentRepository.delete(attachmentId);
    return true;
  }
}
