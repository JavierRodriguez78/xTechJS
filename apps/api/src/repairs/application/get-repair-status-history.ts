import { Qualifier, Service } from "@xtaskjs/core";
import type { RepairStatusEvent } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";

@Service()
export class GetRepairStatusHistory {
  constructor(@Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository) {}

  execute(id: string): Promise<readonly RepairStatusEvent[]> {
    return this.repairOrderRepository.findStatusHistory(id);
  }
}