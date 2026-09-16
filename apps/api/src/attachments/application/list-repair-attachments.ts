import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairAttachment } from "../domain/repair-attachment.js";
import type { RepairAttachmentRepository } from "./repair-attachment-repository.js";

@Traceable("ListRepairAttachments")
@Service()
export class ListRepairAttachments {
  constructor(@Qualifier("repairAttachmentRepository") private readonly attachmentRepository: RepairAttachmentRepository) {}

  execute(repairOrderId: string): Promise<readonly RepairAttachment[]> {
    return this.attachmentRepository.listByRepairOrder(repairOrderId);
  }
}
