import { Qualifier, Service } from "@xtaskjs/core";
import type { RepairOrder } from "../domain/repair-order.js";
import { canTransitionRepairStatus, type RepairStatus } from "../domain/repair-status.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";

@Service()
export class ChangeRepairStatus {
  constructor(@Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository) {}

  async execute(id: string, status: RepairStatus, note?: string): Promise<RepairOrder | undefined> {
    const repair = await this.repairOrderRepository.findById(id);
    if (!repair) return undefined;
    if (!canTransitionRepairStatus(repair.status, status)) {
      throw new Error(`Cannot change repair status from ${repair.status} to ${status}`);
    }
    return this.repairOrderRepository.changeStatus(id, status, note?.trim());
  }
}