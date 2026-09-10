import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { AdjustInventoryInput, CreateInventoryItemInput, InventoryItem, InventoryMovement } from "../../domain/inventory-item.js";
import type { InventoryRepository } from "../../application/inventory-repository.js";
import { InventoryItemEntitySchema, InventoryMovementEntitySchema } from "./inventory-entity.js";

@Traceable("PostgresInventoryRepository")
@Service({ name: "inventoryRepository" })
export class PostgresInventoryRepository implements InventoryRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  create(input: CreateInventoryItemInput & { id: string }): Promise<InventoryItem> {
    return this.dataSource.getRepository(InventoryItemEntitySchema).save({ ...input, stock: 0 });
  }

  findAll(): Promise<readonly InventoryItem[]> {
    return this.dataSource.getRepository(InventoryItemEntitySchema).find({ order: { name: "ASC" } });
  }

  findById(id: string): Promise<InventoryItem | undefined> {
    return this.dataSource.getRepository(InventoryItemEntitySchema).findOneBy({ id }).then((item) => item ?? undefined);
  }

  async adjustStock(id: string, input: AdjustInventoryInput): Promise<InventoryItem | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(InventoryItemEntitySchema);
      const item = await repository.findOneBy({ id });
      if (!item) return undefined;
      const nextStock = item.stock + input.quantity;
      if (nextStock < 0) throw new Error("Inventory stock cannot be negative");
      item.stock = nextStock;
      const saved = await repository.save(item);
      await manager.getRepository(InventoryMovementEntitySchema).save({ id: randomUUID(), inventoryItemId: id, repairOrderId: input.repairOrderId || null, quantity: input.quantity, type: input.type, note: input.note || null });
      return saved;
    });
  }

  findMovements(id: string): Promise<readonly InventoryMovement[]> {
    return this.dataSource.getRepository(InventoryMovementEntitySchema).find({ where: { inventoryItemId: id }, order: { createdAt: "DESC" } });
  }
}
