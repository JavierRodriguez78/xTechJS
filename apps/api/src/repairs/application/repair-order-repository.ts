import type { CreateRepairOrderInput, RepairOrder, RepairStatusEvent } from "../domain/repair-order.js";
import type { RepairStatus } from "../domain/repair-status.js";

export interface NewRepairOrderRecord extends CreateRepairOrderInput {
  id: string;
}

export interface RepairOrderRepository {
  create(input: NewRepairOrderRecord): Promise<RepairOrder>;
  findAll(): Promise<readonly RepairOrder[]>;
  findById(id: string): Promise<RepairOrder | undefined>;
  changeStatus(id: string, status: RepairStatus, note?: string): Promise<RepairOrder | undefined>;
  findStatusHistory(id: string): Promise<readonly RepairStatusEvent[]>;
}