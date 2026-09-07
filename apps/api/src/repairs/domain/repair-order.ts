import type { RepairStatus } from "./repair-status.js";

export interface RepairOrder {
  id: string;
  customerId: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  reportedIssue: string;
  deliveredAccessories: string | null;
  status: RepairStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepairStatusEvent {
  id: string;
  repairOrderId: string;
  status: RepairStatus;
  note: string | null;
  createdAt: Date;
}

export interface CreateRepairOrderInput {
  customerId: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber?: string;
  reportedIssue: string;
  deliveredAccessories?: string;
}