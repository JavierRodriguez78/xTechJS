import type { RepairStatusEvent } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";

export class GetRepairStatusHistory {
  constructor(private readonly repairOrderRepository: RepairOrderRepository) {}

  execute(id: string): Promise<readonly RepairStatusEvent[]> {
    return this.repairOrderRepository.findStatusHistory(id);
  }
}