export type InventoryMovementType = "receipt" | "adjustment" | "consumption";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  stock: number;
  minimumStock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInventoryItemInput {
  sku: string;
  name: string;
  description?: string;
  unit?: string;
  minimumStock?: number;
}

export interface AdjustInventoryInput {
  quantity: number;
  type: InventoryMovementType;
  repairOrderId?: string;
  note?: string;
}

export interface InventoryMovement {
  id: string;
  inventoryItemId: string;
  repairOrderId: string | null;
  quantity: number;
  type: InventoryMovementType;
  note: string | null;
  createdAt: Date;
}
