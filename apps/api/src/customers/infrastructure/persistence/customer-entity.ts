import { EntitySchema } from "typeorm";
import type { Customer } from "../../domain/customer.js";

export const CustomerEntitySchema = new EntitySchema<Customer>({
  name: "Customer",
  tableName: "customers",
  columns: {
    id: { type: "uuid", primary: true },
    displayName: { type: String, name: "display_name" },
    email: { type: String, unique: true },
    phone: { type: String, nullable: true },
    address: { type: String, nullable: true },
    taxId: { type: String, name: "tax_id", nullable: true, unique: true },
    internalNotes: { type: String, name: "internal_notes", nullable: true },
    registrationStatus: { type: String, name: "registration_status", default: "pending" },
    billingName: { type: String, name: "billing_name", nullable: true },
    billingTaxId: { type: String, name: "billing_tax_id", nullable: true },
    billingAddress: { type: String, name: "billing_address", nullable: true },
    billingPostalCode: { type: String, name: "billing_postal_code", nullable: true },
    billingCity: { type: String, name: "billing_city", nullable: true },
    billingProvince: { type: String, name: "billing_province", nullable: true },
    tags: { type: "jsonb", default: [] },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});