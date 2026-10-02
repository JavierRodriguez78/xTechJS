import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairAttachment } from "../domain/repair-attachment.js";
import type { AttachmentStorage } from "./attachment-storage.js";
import type { RepairAttachmentRepository } from "./repair-attachment-repository.js";
import type { EcommerceAttachmentOwner } from "./upload-ecommerce-attachment.js";

export interface EcommerceAttachmentDownload {
  attachment: RepairAttachment;
  buffer: Buffer;
}

@Traceable("GetEcommerceAttachment")
@Service()
export class GetEcommerceAttachment {
  constructor(
    @Qualifier("repairAttachmentRepository") private readonly attachmentRepository: RepairAttachmentRepository,
    @Qualifier("attachmentStorage") private readonly storage: AttachmentStorage
  ) {}

  async execute(owner: EcommerceAttachmentOwner, ownerId: string, attachmentId: string): Promise<EcommerceAttachmentDownload | undefined> {
    const attachment = await this.attachmentRepository.findById(attachmentId);
    const belongsToOwner = owner === "product"
      ? attachment?.ecommerceProductId === ownerId
      : attachment?.tradeInRequestId === ownerId;
    if (!belongsToOwner || !attachment) return undefined;
    const chunks: Buffer[] = [];
    for await (const chunk of this.storage.read(attachment.storageKey)) chunks.push(chunk as Buffer);
    return { attachment, buffer: Buffer.concat(chunks) };
  }
}
