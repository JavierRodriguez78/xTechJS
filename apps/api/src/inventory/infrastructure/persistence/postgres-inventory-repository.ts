import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import { InvoiceDraftEntitySchema } from "../../../payments/infrastructure/persistence/invoice-draft-entity.js";
import { StoreEntitySchema } from "../../../stores/infrastructure/persistence/store-entity.js";
import type { AdjustInventoryInput, CreateInventoryItemInput, InventoryItem, InventoryMovement } from "../../domain/inventory-item.js";
import type { InventoryRepository } from "../../application/inventory-repository.js";
import { InventoryItemEntitySchema, InventoryMovementEntitySchema, StoreInventoryStockEntitySchema } from "./inventory-entity.js";

@Traceable("PostgresInventoryRepository")
@Service({ name: "inventoryRepository" })
export class PostgresInventoryRepository implements InventoryRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async create(input: CreateInventoryItemInput & { id: string }): Promise<InventoryItem> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.getRepository(InventoryItemEntitySchema).save({ ...input, stock: 0 });
      const stores = await manager.getRepository(StoreEntitySchema).find({ where: { active: true } });
      if (stores.length) await manager.getRepository(StoreInventoryStockEntitySchema).save(stores.map((store) => ({ storeId: store.id, inventoryItemId: item.id, stock: 0, minimumStock: input.minimumStock ?? 0 })));
      return item;
    });
  }

  async findAll(storeId: string): Promise<readonly InventoryItem[]> {
    const { entities, raw } = await this.dataSource.getRepository(InventoryItemEntitySchema).createQueryBuilder("item").innerJoin("store_inventory_stock", "store_stock", "store_stock.inventory_item_id = item.id AND store_stock.store_id = :storeId", { storeId }).addSelect("store_stock.stock", "store_stock_value").addSelect("store_stock.minimum_stock", "store_minimum_value").orderBy("item.name", "ASC").getRawAndEntities();
    return entities.map((item, index) => ({ ...item, stock: Number(raw[index].store_stock_value), minimumStock: Number(raw[index].store_minimum_value) }));
  }

  async findBelowMinimum(storeId: string): Promise<readonly InventoryItem[]> {
    const { entities, raw } = await this.dataSource.getRepository(InventoryItemEntitySchema).createQueryBuilder("item").innerJoin("store_inventory_stock", "store_stock", "store_stock.inventory_item_id = item.id AND store_stock.store_id = :storeId", { storeId }).where("store_stock.stock <= store_stock.minimum_stock").addSelect("store_stock.stock", "store_stock_value").addSelect("store_stock.minimum_stock", "store_minimum_value").orderBy("store_stock.stock", "ASC").addOrderBy("item.name", "ASC").getRawAndEntities();
    return entities.map((item, index) => ({ ...item, stock: Number(raw[index].store_stock_value), minimumStock: Number(raw[index].store_minimum_value) }));
  }

  findById(id: string): Promise<InventoryItem | undefined> {
    return this.dataSource.getRepository(InventoryItemEntitySchema).findOneBy({ id }).then((item) => item ?? undefined);
  }

  async adjustStock(storeId: string, id: string, input: AdjustInventoryInput): Promise<InventoryItem | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(InventoryItemEntitySchema);
      const item = await repository.findOneBy({ id });
      if (!item) return undefined;
      const stockRepository = manager.getRepository(StoreInventoryStockEntitySchema);
      const storeStock = await stockRepository.findOneBy({ storeId, inventoryItemId: id });
      if (!storeStock) throw new Error("Inventory stock is not configured for this store");
      const nextStock = storeStock.stock + input.quantity;
      if (nextStock < 0) throw new Error("Inventory stock cannot be negative");
      storeStock.stock = nextStock;
      await stockRepository.save(storeStock);
      const movement = await manager.getRepository(InventoryMovementEntitySchema).save({ id: randomUUID(), storeId, inventoryItemId: id, repairOrderId: input.repairOrderId || null, quantity: input.quantity, type: input.type, note: input.note || null });
      if (input.type === "consumption" && input.repairOrderId) {
        const draftRepository = manager.getRepository(InvoiceDraftEntitySchema);
        const draft = await draftRepository.findOneBy({ repairOrderId: input.repairOrderId });
        const lines = draft?.lines ?? [];
        if (!lines.some((line: { sourceMovementId?: string }) => line.sourceMovementId === movement.id)) {
          lines.push({
            sourceMovementId: movement.id,
            code: item.sku,
            concept: item.name,
            quantity: Math.abs(input.quantity),
            unitPriceCents: item.salePriceCents,
            discountPercent: 0,
            taxRate: item.taxRate
          });
          await draftRepository.save(draft ?? {
            id: randomUUID(),
            repairOrderId: input.repairOrderId,
            lines,
            status: "draft"
          });
        }
      }
      return { ...item, stock: nextStock, minimumStock: storeStock.minimumStock };
    });
  }

  findMovements(storeId: string, id: string): Promise<readonly InventoryMovement[]> {
    return this.dataSource.getRepository(InventoryMovementEntitySchema).find({ where: { storeId, inventoryItemId: id }, order: { createdAt: "DESC" } });
  }
}
