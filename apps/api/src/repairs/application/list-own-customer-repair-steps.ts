import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import type { RepairStep } from "../domain/repair-step.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import type { RepairStepRepository } from "./repair-step-repository.js";

@Traceable("ListOwnCustomerRepairSteps")
@Service()
export class ListOwnCustomerRepairSteps {
  constructor(
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    @Qualifier("repairStepRepository") private readonly repairStepRepository: RepairStepRepository
  ) {}

  async execute(repairOrderId: string, email: string): Promise<readonly RepairStep[] | undefined> {
    const customer = await this.customerRepository.findByEmail(email);
    const repair = await this.repairOrderRepository.findById(repairOrderId);
    if (!customer || !repair || repair.customerId !== customer.id) return undefined;
    return this.repairStepRepository.listByRepairOrder(repairOrderId);
  }
}