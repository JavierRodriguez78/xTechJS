import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { InventoryMovement } from "../domain/inventory-item.js";
import type { InventoryRepository } from "./inventory-repository.js";

@Traceable("GetInventoryMovements")
@Service()
export class GetInventoryMovements {
  constructor(@Qualifier("inventoryRepository") private readonly inventoryRepository: InventoryRepository) {}

  execute(id: string): Promise<readonly InventoryMovement[]> {
    return this.inventoryRepository.findMovements(id);
  }
}
