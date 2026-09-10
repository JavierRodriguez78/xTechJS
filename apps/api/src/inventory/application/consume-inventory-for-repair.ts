import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { InventoryItem } from "../domain/inventory-item.js";
import type { InventoryRepository } from "./inventory-repository.js";

@Traceable("ConsumeInventoryForRepair")
@Service()
export class ConsumeInventoryForRepair {
  constructor(@Qualifier("inventoryRepository") private readonly inventoryRepository: InventoryRepository) {}

  execute(repairOrderId: string, inventoryItemId: string, quantity: number, note?: string): Promise<InventoryItem | undefined> {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Consumed inventory quantity must be a positive integer");
    return this.inventoryRepository.adjustStock(inventoryItemId, { quantity: -quantity, type: "consumption", repairOrderId, note: note?.trim() });
  }
}