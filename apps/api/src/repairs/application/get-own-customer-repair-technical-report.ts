import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import { GetRepairTechnicalReport } from "./get-repair-technical-report.js";

@Traceable("GetOwnCustomerRepairTechnicalReport")
@Service()
export class GetOwnCustomerRepairTechnicalReport {
  constructor(
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    private readonly report: GetRepairTechnicalReport
  ) {}

  async execute(repairOrderId: string, email: string): Promise<Buffer | undefined> {
    const [customer, repair] = await Promise.all([this.customerRepository.findByEmail(email), this.repairOrderRepository.findById(repairOrderId)]);
    if (!customer || !repair || repair.customerId !== customer.id) return undefined;
    return this.report.execute(repairOrderId);
  }
}