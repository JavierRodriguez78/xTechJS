import { EntitySchema } from "typeorm";
import type { InventoryItem, InventoryMovement } from "../../domain/inventory-item.js";

export const InventoryItemEntitySchema = new EntitySchema<InventoryItem>({
  name: "InventoryItem",
  tableName: "inventory_items",
  columns: {
    id: { type: "uuid", primary: true },
    sku: { type: String, unique: true },
    name: { type: String },
    description: { type: String, nullable: true },
    unit: { type: String, default: "unidad" },
    stock: { type: Number, default: 0 },
    minimumStock: { type: Number, name: "minimum_stock", default: 0 },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});

export const InventoryMovementEntitySchema = new EntitySchema<InventoryMovement>({
  name: "InventoryMovement",
  tableName: "inventory_movements",
  columns: {
    id: { type: "uuid", primary: true },
    inventoryItemId: { type: "uuid", name: "inventory_item_id" },
    repairOrderId: { type: "uuid", name: "repair_order_id", nullable: true },
    quantity: { type: Number },
    type: { type: String },
    note: { type: String, nullable: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true }
  }
});
