import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { InventoryItem } from "../domain/inventory-item.js";
import type { InventoryRepository } from "./inventory-repository.js";

@Traceable("ListInventoryItems")
@Service()
export class ListInventoryItems {
  constructor(@Qualifier("inventoryRepository") private readonly inventoryRepository: InventoryRepository) {}

  execute(): Promise<readonly InventoryItem[]> {
    return this.inventoryRepository.findAll();
  }
}
