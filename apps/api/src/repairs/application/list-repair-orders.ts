import { Qualifier, Service } from "@xtaskjs/core";
import type { RepairOrder } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";

@Service()
export class ListRepairOrders {
  constructor(@Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository) {}

  execute(): Promise<readonly RepairOrder[]> {
    return this.repairOrderRepository.findAll();
  }
}