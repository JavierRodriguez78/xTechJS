import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairOrder } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";

@Traceable("GetRepairOrder")
@Service()
export class GetRepairOrder {
  constructor(@Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository) {}

  execute(id: string): Promise<RepairOrder | undefined> {
    return this.repairOrderRepository.findById(id);
  }
}
