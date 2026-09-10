import type { AdjustInventoryInput, CreateInventoryItemInput, InventoryItem, InventoryMovement } from "../domain/inventory-item.js";

export interface InventoryRepository {
  create(input: CreateInventoryItemInput & { id: string }): Promise<InventoryItem>;
  findAll(): Promise<readonly InventoryItem[]>;
  findBelowMinimum(): Promise<readonly InventoryItem[]>;
  findById(id: string): Promise<InventoryItem | undefined>;
  adjustStock(id: string, input: AdjustInventoryInput): Promise<InventoryItem | undefined>;
  findMovements(id: string): Promise<readonly InventoryMovement[]>;
}
