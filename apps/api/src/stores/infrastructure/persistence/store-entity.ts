import { EntitySchema } from "typeorm";
import type { Store } from "../../domain/store.js";

export const StoreEntitySchema = new EntitySchema<Store>({
  name: "Store", tableName: "stores",
  columns: {
    id: { type: "uuid", primary: true }, name: { type: String }, legalName: { type: String, name: "legal_name", nullable: true }, address: { type: String }, addressStreet: { type: String, name: "address_street" }, addressPostalCode: { type: String, name: "address_postal_code" }, addressCity: { type: String, name: "address_city" }, addressProvince: { type: String, name: "address_province" }, addressCountry: { type: String, name: "address_country", default: "España" }, phone: { type: String, nullable: true }, email: { type: String, nullable: true }, taxId: { type: String, name: "tax_id", nullable: true }, openingHours: { type: String, name: "opening_hours", nullable: true }, invoiceSeriesPrefix: { type: String, name: "invoice_series_prefix" }, logoUrl: { type: String, name: "logo_url", nullable: true }, veriFactuSystemId: { type: String, name: "verifactu_system_id", nullable: true }, active: { type: Boolean, default: true }, createdAt: { type: "timestamptz", name: "created_at", createDate: true }, updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});