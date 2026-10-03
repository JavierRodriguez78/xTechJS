import { EntitySchema } from "typeorm";
import type { SupplierCatalogItem } from "../../domain/supplier-catalog-item.js";

export const SupplierCatalogItemEntitySchema = new EntitySchema<SupplierCatalogItem>({
  name: "SupplierCatalogItem",
  tableName: "inventory_supplier_catalog_items",
  columns: {
    id: { type: "uuid", primary: true },
    supplierId: { type: "uuid", name: "supplier_id" },
    externalRef: { type: String, name: "external_ref", length: 500 },
    name: { type: String, length: 200 },
    category: { type: String, nullable: true, length: 120 },
    brand: { type: String, nullable: true, length: 120 },
    compatibleModels: { type: "jsonb", name: "compatible_models", default: [] },
    sku: { type: String, nullable: true, length: 120 },
    priceCents: { type: Number, name: "price_cents" },
    currency: { type: String, length: 3, default: "EUR" },
    availability: { type: String, length: 20, default: "unknown" },
    url: { type: String, length: 2000 },
    capturedAt: { type: "timestamptz", name: "captured_at" },
    inventoryItemId: { type: "uuid", name: "inventory_item_id", nullable: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  },
  indices: [
    { columns: ["supplierId", "externalRef"], unique: true, name: "UQ_inventory_supplier_catalog_supplier_external_ref" },
    { columns: ["name"], name: "IDX_inventory_supplier_catalog_name" },
    { columns: ["category"], name: "IDX_inventory_supplier_catalog_category" },
    { columns: ["brand"], name: "IDX_inventory_supplier_catalog_brand" },
    { columns: ["availability"], name: "IDX_inventory_supplier_catalog_availability" },
    { columns: ["priceCents"], name: "IDX_inventory_supplier_catalog_price" },
    { columns: ["inventoryItemId"], name: "IDX_inventory_supplier_catalog_inventory_item" }
  ]
});
