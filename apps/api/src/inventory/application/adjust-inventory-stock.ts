import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { AdjustInventoryInput, InventoryItem } from "../domain/inventory-item.js";
import type { InventoryRepository } from "./inventory-repository.js";

@Traceable("AdjustInventoryStock")
@Service()
export class AdjustInventoryStock {
  constructor(@Qualifier("inventoryRepository") private readonly inventoryRepository: InventoryRepository) {}

  execute(id: string, input: AdjustInventoryInput): Promise<InventoryItem | undefined> {
    if (!Number.isInteger(input.quantity) || input.quantity === 0) throw new Error("Inventory quantity must be a non-zero integer");
    return this.inventoryRepository.adjustStock(id, { ...input, note: input.note?.trim() });
  }
}
