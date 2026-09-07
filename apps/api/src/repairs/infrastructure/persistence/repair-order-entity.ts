import { EntitySchema } from "typeorm";
import type { RepairOrder, RepairStatusEvent } from "../../domain/repair-order.js";

export const RepairOrderEntitySchema = new EntitySchema<RepairOrder>({
  name: "RepairOrder",
  tableName: "repair_orders",
  columns: {
    id: { type: "uuid", primary: true }, customerId: { type: "uuid", name: "customer_id" },
    deviceType: { type: String, name: "device_type" }, brand: { type: String }, model: { type: String },
    serialNumber: { type: String, name: "serial_number", nullable: true }, reportedIssue: { type: String, name: "reported_issue" },
    deliveredAccessories: { type: String, name: "delivered_accessories", nullable: true }, status: { type: String },
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