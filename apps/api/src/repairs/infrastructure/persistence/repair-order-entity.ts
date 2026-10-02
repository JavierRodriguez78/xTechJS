import { EntitySchema } from "typeorm";
import type { RepairConditionRecord, RepairDeviceSecret, RepairOrder, RepairStatusEvent } from "../../domain/repair-order.js";

export const RepairOrderEntitySchema = new EntitySchema<RepairOrder>({
  name: "RepairOrder",
  tableName: "repair_orders",
  columns: {
    id: { type: "uuid", primary: true }, customerId: { type: "uuid", name: "customer_id" },
    deviceType: { type: String, name: "device_type" }, brand: { type: String }, model: { type: String },
    serialNumber: { type: String, name: "serial_number", nullable: true }, reportedIssue: { type: String, name: "reported_issue" },
    deliveredAccessories: { type: String, name: "delivered_accessories", nullable: true }, technicianId: { type: "uuid", name: "technician_id", nullable: true }, estimatedCompletionAt: { type: "timestamptz", name: "estimated_completion_at", nullable: true }, diagnosis: { type: String, nullable: true }, status: { type: String },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true }, updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});

export const RepairStatusEventEntitySchema = new EntitySchema<RepairStatusEvent>({
  name: "RepairStatusEvent",
  tableName: "repair_status_events",
  columns: {
    id: { type: "uuid", primary: true }, repairOrderId: { type: "uuid", name: "repair_order_id" },
    status: { type: String }, note: { type: String, nullable: true }, createdAt: { type: "timestamptz", name: "created_at", createDate: true }
  }
});

export const RepairConditionRecordEntitySchema = new EntitySchema<RepairConditionRecord>({
  name: "RepairConditionRecord", tableName: "repair_condition_records",
  columns: {
    id: { type: "uuid", primary: true }, repairOrderId: { type: "uuid", name: "repair_order_id" }, phase: { type: String }, checklist: { type: "jsonb" }, recordedByUserId: { type: "uuid", name: "recorded_by_user_id" }, createdAt: { type: "timestamptz", name: "created_at", createDate: true }
  }
});

export const RepairDeviceSecretEntitySchema = new EntitySchema<RepairDeviceSecret>({
  name: "RepairDeviceSecret", tableName: "repair_device_secrets",
  columns: {
    repairOrderId: { type: "uuid", name: "repair_order_id", primary: true }, encryptedPasscode: { type: "text", name: "encrypted_passcode" }, createdAt: { type: "timestamptz", name: "created_at", createDate: true }, updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});