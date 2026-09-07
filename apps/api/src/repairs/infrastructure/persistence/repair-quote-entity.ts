import { EntitySchema } from "typeorm";
import type { RepairQuote } from "../../domain/repair-quote.js";

export const RepairQuoteEntitySchema = new EntitySchema<RepairQuote>({
  name: "RepairQuote",
  tableName: "repair_quotes",
  columns: {
    id: { type: "uuid", primary: true },
    repairOrderId: { type: "uuid", name: "repair_order_id", unique: true },
    lines: { type: "jsonb" },
    totalCents: { type: Number, name: "total_cents" },
    status: { type: String },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});