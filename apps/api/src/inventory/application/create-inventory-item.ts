import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CreateInventoryItemInput, InventoryItem } from "../domain/inventory-item.js";
import type { InventoryRepository } from "./inventory-repository.js";

@Traceable("CreateInventoryItem")
@Service()
export class CreateInventoryItem {
  constructor(@Qualifier("inventoryRepository") private readonly inventoryRepository: InventoryRepository) {}

  execute(input: CreateInventoryItemInput): Promise<InventoryItem> {
    return this.inventoryRepository.create({
      ...input,
      id: randomUUID(),
      sku: input.sku.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description?.trim(),
      unit: input.unit?.trim() || "unidad",
      minimumStock: input.minimumStock ?? 0
    });
  }
}
