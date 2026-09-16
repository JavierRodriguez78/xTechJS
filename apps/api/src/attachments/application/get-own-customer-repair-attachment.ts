import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import type { RepairOrderRepository } from "../../repairs/application/repair-order-repository.js";
import { GetRepairAttachment, type AttachmentDownload } from "./get-repair-attachment.js";

@Traceable("GetOwnCustomerRepairAttachment")
@Service()
export class GetOwnCustomerRepairAttachment {
  constructor(
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    private readonly getRepairAttachment: GetRepairAttachment
  ) {}

  async execute(repairOrderId: string, attachmentId: string, email: string): Promise<AttachmentDownload | undefined> {
    const customer = await this.customerRepository.findByEmail(email);
    const repair = await this.repairOrderRepository.findById(repairOrderId);
    if (!customer || !repair || repair.customerId !== customer.id) return undefined;
    const download = await this.getRepairAttachment.execute(attachmentId);
    if (!download || download.attachment.repairOrderId !== repairOrderId) return undefined;
    return download;
  }
}
