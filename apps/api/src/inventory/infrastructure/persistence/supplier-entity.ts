import { EntitySchema } from "typeorm";
import type { Supplier } from "../../domain/supplier.js";

export const SupplierEntitySchema = new EntitySchema<Supplier>({
  name: "Supplier",
  tableName: "inventory_suppliers",
  columns: {
    id: { type: "uuid", primary: true },
    name: { type: String, unique: true },
    email: { type: String, nullable: true },
    phone: { type: String, nullable: true },
    notes: { type: String, nullable: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});
