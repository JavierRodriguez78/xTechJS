import { EntitySchema } from "typeorm";
import type { PurchaseOrder, PurchaseOrderLine } from "../../domain/purchase-order.js";

export const PurchaseOrderEntitySchema = new EntitySchema<PurchaseOrder>({
  name: "PurchaseOrder",
  tableName: "purchase_orders",
  columns: {
    id: { type: "uuid", primary: true }, supplierId: { type: "uuid", name: "supplier_id" },
    status: { type: String }, lines: { type: "jsonb" }, createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    receivedAt: { type: "timestamptz", name: "received_at", nullable: true }
  }
});

export type PurchaseOrderLineRecord = PurchaseOrderLine;
