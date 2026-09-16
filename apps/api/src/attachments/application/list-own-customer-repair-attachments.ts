import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import type { RepairOrderRepository } from "../../repairs/application/repair-order-repository.js";
import type { RepairAttachment } from "../domain/repair-attachment.js";
import { ListRepairAttachments } from "./list-repair-attachments.js";

@Traceable("ListOwnCustomerRepairAttachments")
@Service()
export class ListOwnCustomerRepairAttachments {
  constructor(
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    private readonly listRepairAttachments: ListRepairAttachments
  ) {}

  async execute(repairOrderId: string, email: string): Promise<readonly RepairAttachment[] | undefined> {
    const customer = await this.customerRepository.findByEmail(email);
    const repair = await this.repairOrderRepository.findById(repairOrderId);
    if (!customer || !repair || repair.customerId !== customer.id) return undefined;
    return this.listRepairAttachments.execute(repairOrderId);
  }
}
