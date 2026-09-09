import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairOrder } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";

@Traceable("ListRepairOrders")
@Service()
export class ListRepairOrders {
  constructor(@Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository) {}

  execute(): Promise<readonly RepairOrder[]> {
    return this.repairOrderRepository.findAll();
  }
}