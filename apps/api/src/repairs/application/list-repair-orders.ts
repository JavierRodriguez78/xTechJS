import type { RepairOrder } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";

export class ListRepairOrders {
  constructor(private readonly repairOrderRepository: RepairOrderRepository) {}

  execute(): Promise<readonly RepairOrder[]> {
    return this.repairOrderRepository.findAll();
  }
}