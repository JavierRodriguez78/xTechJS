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
    addressStreet: { type: String, name: "address_street", nullable: true },
    addressPostalCode: { type: String, name: "address_postal_code", nullable: true },
    addressCity: { type: String, name: "address_city", nullable: true },
    addressProvince: { type: String, name: "address_province", nullable: true },
    addressCountry: { type: String, name: "address_country", nullable: true },
    taxId: { type: String, name: "tax_id", nullable: true, unique: true },
    customerType: { type: String, name: "customer_type", nullable: true },
    internalNotes: { type: String, name: "internal_notes", nullable: true },
    registrationStatus: { type: String, name: "registration_status", default: "pending" },
    acquisitionChannel: { type: String, name: "acquisition_channel", default: "staff" },
    originStoreId: { type: "uuid", name: "origin_store_id", nullable: true },
    billingName: { type: String, name: "billing_name", nullable: true },
    billingTaxId: { type: String, name: "billing_tax_id", nullable: true },
    billingAddressStreet: { type: String, name: "billing_address_street", nullable: true },
    billingAddressPostalCode: { type: String, name: "billing_address_postal_code", nullable: true },
    billingAddressCity: { type: String, name: "billing_address_city", nullable: true },
    billingAddressProvince: { type: String, name: "billing_address_province", nullable: true },
    billingAddressCountry: { type: String, name: "billing_address_country", nullable: true },
    tags: { type: "jsonb", default: [] },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});