import { EntitySchema } from "typeorm";
import type { InvoiceDraft } from "../../domain/invoice-draft.js";

export const InvoiceDraftEntitySchema = new EntitySchema<InvoiceDraft>({
  name: "InvoiceDraft",
  tableName: "invoice_drafts",
  columns: {
    id: { type: "uuid", primary: true },
    repairOrderId: { type: "uuid", name: "repair_order_id", unique: true },
    lines: { type: "jsonb", default: [] },
    status: { type: String, default: "draft" },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});
