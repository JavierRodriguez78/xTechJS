import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairOrder } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";

@Traceable("ListCustomerRepairs")
@Service()
export class ListCustomerRepairs {
  constructor(@Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository) {}

  execute(customerId: string): Promise<readonly RepairOrder[]> {
    return this.repairOrderRepository.findByCustomerId(customerId);
  }
}