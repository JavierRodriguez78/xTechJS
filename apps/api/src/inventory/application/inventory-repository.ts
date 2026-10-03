import type { AdjustInventoryInput, CreateInventoryItemInput, InventoryItem, InventoryMovement } from "../domain/inventory-item.js";

export interface InventoryRepository {
  create(input: CreateInventoryItemInput & { id: string; storeIds?: readonly string[] | null }): Promise<InventoryItem>;
  findAll(storeId: string): Promise<readonly InventoryItem[]>;
  findBelowMinimum(storeId: string): Promise<readonly InventoryItem[]>;
  findById(id: string): Promise<InventoryItem | undefined>;
  adjustStock(storeId: string, id: string, input: AdjustInventoryInput): Promise<InventoryItem | undefined>;
  findMovements(storeId: string, id: string): Promise<readonly InventoryMovement[]>;
}
