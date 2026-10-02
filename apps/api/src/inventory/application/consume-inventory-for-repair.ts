import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { InventoryItem } from "../domain/inventory-item.js";
import type { InventoryRepository } from "./inventory-repository.js";
import type { RepairOrderRepository } from "../../repairs/application/repair-order-repository.js";

@Traceable("ConsumeInventoryForRepair")
@Service()
export class ConsumeInventoryForRepair {
  constructor(
    @Qualifier("inventoryRepository") private readonly inventoryRepository: InventoryRepository,
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository
  ) {}

  async execute(repairOrderId: string, inventoryItemId: string, quantity: number, note?: string): Promise<InventoryItem | undefined> {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Consumed inventory quantity must be a positive integer");
    const repair = await this.repairOrderRepository.findById(repairOrderId);
    if (!repair?.storeId) return undefined;
    return this.inventoryRepository.adjustStock(repair.storeId, inventoryItemId, { quantity: -quantity, type: "consumption", repairOrderId, note: note?.trim() });
  }
}