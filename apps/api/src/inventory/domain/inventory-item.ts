export type InventoryMovementType = "receipt" | "adjustment" | "consumption" | "transfer_out" | "transfer_in";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  stock: number;
  minimumStock: number;
  salePriceCents: number;
  taxRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInventoryItemInput {
  sku: string;
  name: string;
  description?: string;
  unit?: string;
  minimumStock?: number;
  salePriceCents?: number;
  taxRate?: number;
}

export interface AdjustInventoryInput {
  quantity: number;
  type: InventoryMovementType;
  repairOrderId?: string;
  note?: string;
}

export interface InventoryMovement {
  id: string;
  storeId?: string;
  inventoryItemId: string;
  repairOrderId: string | null;
  stockTransferOrderId: string | null;
  quantity: number;
  type: InventoryMovementType;
  note: string | null;
  createdAt: Date;
}

export interface StoreInventoryStock {
  storeId: string;
  inventoryItemId: string;
  stock: number;
  minimumStock: number;
  updatedAt: Date;
}
