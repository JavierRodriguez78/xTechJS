import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairAttachment } from "../domain/repair-attachment.js";
import type { RepairAttachmentRepository } from "./repair-attachment-repository.js";
import type { EcommerceAttachmentOwner } from "./upload-ecommerce-attachment.js";

@Traceable("ListEcommerceAttachments")
@Service()
export class ListEcommerceAttachments {
  constructor(@Qualifier("repairAttachmentRepository") private readonly attachmentRepository: RepairAttachmentRepository) {}

  execute(owner: EcommerceAttachmentOwner, ownerId: string): Promise<readonly RepairAttachment[]> {
    return owner === "product"
      ? this.attachmentRepository.listByEcommerceProduct(ownerId)
      : this.attachmentRepository.listByTradeInRequest(ownerId);
  }
}
