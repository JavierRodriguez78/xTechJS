import type { CreateRepairOrderInput, RepairOrder, RepairStatusEvent, UpdateRepairTechnicalInput } from "../domain/repair-order.js";
import type { RepairStatus } from "../domain/repair-status.js";

export interface NewRepairOrderRecord extends Omit<CreateRepairOrderInput, "devicePasscode"> {
  id: string;
  devicePasscodeEncrypted?: string;
  recordedByUserId: string;
}

export interface RepairOrderListOptions {
  query?: string;
  status?: string;
  technicianId?: string;
  deviceType?: string;
  customerId?: string;
  receivedFrom?: Date;
  receivedTo?: Date;
  sort: "createdAt:asc" | "createdAt:desc" | "brand:asc" | "brand:desc";
  page: number;
  pageSize: number;
}

export interface RepairOrderPage {
  items: readonly RepairOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RepairOrderRepository {
  create(input: NewRepairOrderRecord): Promise<RepairOrder>;
  findAll(): Promise<readonly RepairOrder[]>;
  findPage(options: RepairOrderListOptions): Promise<RepairOrderPage>;
  findById(id: string): Promise<RepairOrder | undefined>;
  findByCustomerId(customerId: string): Promise<readonly RepairOrder[]>;
  changeStatus(id: string, status: RepairStatus, note?: string): Promise<RepairOrder | undefined>;
  findStatusHistory(id: string): Promise<readonly RepairStatusEvent[]>;
  updateTechnical(id: string, input: UpdateRepairTechnicalInput): Promise<RepairOrder | undefined>;
}