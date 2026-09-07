import { EntitySchema } from "typeorm";
import type { Customer } from "../../domain/customer.js";

export const CustomerEntitySchema = new EntitySchema<Customer>({
  name: "Customer",
  tableName: "customers",
  columns: {
    id: { type: "uuid", primary: true },
    displayName: { type: String, name: "display_name" },
    email: { type: String, nullable: true, unique: true },
    phone: { type: String, nullable: true },
    address: { type: String, nullable: true },
    taxId: { type: String, name: "tax_id", nullable: true, unique: true },
    internalNotes: { type: String, name: "internal_notes", nullable: true },
    tags: { type: "jsonb", default: [] },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});