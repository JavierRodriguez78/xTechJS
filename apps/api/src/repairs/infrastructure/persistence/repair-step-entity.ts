import { EntitySchema } from "typeorm";
import type { RepairStep } from "../../domain/repair-step.js";

export const RepairStepEntitySchema = new EntitySchema<RepairStep>({
  name: "RepairStep",
  tableName: "repair_steps",
  columns: {
    id: { type: "uuid", primary: true },
    repairOrderId: { type: "uuid", name: "repair_order_id" },
    sequence: { type: Number },
    title: { type: String, length: 200 },
    description: { type: "text", nullable: true },
    technicianId: { type: "uuid", name: "technician_id" },
    performedAt: { type: "timestamptz", name: "performed_at" },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});