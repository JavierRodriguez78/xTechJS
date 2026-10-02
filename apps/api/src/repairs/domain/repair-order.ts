import type { RepairStatus } from "./repair-status.js";
import type { RepairQuoteLine } from "./repair-quote.js";

export interface DeviceConditionChecklist {
  items: { label: string; ok: boolean }[];
  notes?: string;
}

export interface RepairConditionRecord {
  id: string;
  repairOrderId: string;
  phase: "pre_repair" | "post_repair";
  checklist: DeviceConditionChecklist;
  recordedByUserId: string;
  createdAt: Date;
}

export interface RepairDeviceSecret {
  repairOrderId: string;
  encryptedPasscode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepairOrder {
  id: string;
  customerId: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  reportedIssue: string;
  deliveredAccessories: string | null;
  technicianId: string | null;
  estimatedCompletionAt: Date | null;
  diagnosis: string | null;
  status: RepairStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateRepairTechnicalInput {
  technicianId?: string;
  diagnosis?: string;
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
  devicePasscode?: string;
  technicianId?: string;
  estimatedCompletionAt?: Date;
  initialQuoteLines?: RepairQuoteLine[];
  preRepairCondition?: DeviceConditionChecklist;
}