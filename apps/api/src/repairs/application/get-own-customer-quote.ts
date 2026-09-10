import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import type { RepairQuote } from "../domain/repair-quote.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import { GetRepairQuote } from "./get-repair-quote.js";

@Traceable("GetOwnCustomerQuote")
@Service()
export class GetOwnCustomerQuote {
  constructor(
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    private readonly getRepairQuote: GetRepairQuote
  ) {}

  async execute(repairOrderId: string, email: string): Promise<RepairQuote | undefined> {
    const customer = await this.customerRepository.findByEmail(email);
    const repair = await this.repairOrderRepository.findById(repairOrderId);
    if (!customer || !repair || repair.customerId !== customer.id) return undefined;
    return this.getRepairQuote.execute(repairOrderId);
  }
}