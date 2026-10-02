import { EntitySchema } from "typeorm";
import type { Store } from "../../domain/store.js";

export const StoreEntitySchema = new EntitySchema<Store>({
  name: "Store", tableName: "stores",
  columns: {
    id: { type: "uuid", primary: true }, name: { type: String }, address: { type: String }, phone: { type: String, nullable: true }, taxId: { type: String, name: "tax_id", nullable: true }, invoiceSeriesPrefix: { type: String, name: "invoice_series_prefix" }, active: { type: Boolean, default: true }, createdAt: { type: "timestamptz", name: "created_at", createDate: true }, updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});