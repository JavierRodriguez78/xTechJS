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
    secondaryPhone: { type: String, name: "secondary_phone", nullable: true },
    notes: { type: String, nullable: true },
    externalRef: { type: String, name: "external_ref", nullable: true, length: 320 },
    website: { type: String, nullable: true, length: 2000 },
    legalName: { type: String, name: "legal_name", nullable: true, length: 200 },
    taxId: { type: String, name: "tax_id", nullable: true, length: 80 },
    addressStreet: { type: String, name: "address_street", nullable: true, length: 500 },
    addressPostalCode: { type: String, name: "address_postal_code", nullable: true, length: 20 },
    addressCity: { type: String, name: "address_city", nullable: true, length: 120 },
    addressProvince: { type: String, name: "address_province", nullable: true, length: 120 },
    addressCountry: { type: String, name: "address_country", nullable: true, length: 120 },
    paymentTermDays: { type: Number, name: "payment_term_days", nullable: true },
    category: { type: String, nullable: true, length: 120 },
    active: { type: Boolean, default: true },
    deactivatedAt: { type: "timestamptz", name: "deactivated_at", nullable: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});
