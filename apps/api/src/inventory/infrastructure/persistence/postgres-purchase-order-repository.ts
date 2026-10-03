import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { CreatePurchaseOrderInput, PurchaseOrder } from "../../domain/purchase-order.js";
import type { PurchaseOrderRepository } from "../../application/purchase-order-repository.js";
import { InventoryMovementEntitySchema, StoreInventoryStockEntitySchema } from "./inventory-entity.js";
import { PurchaseOrderEntitySchema } from "./purchase-order-entity.js";

@Traceable("PostgresPurchaseOrderRepository")
@Service({ name: "purchaseOrderRepository" })
export class PostgresPurchaseOrderRepository implements PurchaseOrderRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  create(input: CreatePurchaseOrderInput & { id: string }): Promise<PurchaseOrder> {
    return this.dataSource.getRepository(PurchaseOrderEntitySchema).save({ ...input, status: "draft", lines: input.lines.map((line) => ({ ...line, id: randomUUID() })) });
  }

  async findAll(storeIds?: readonly string[] | null): Promise<readonly PurchaseOrder[]> {
    if (storeIds?.length === 0) return [];
    const repository = this.dataSource.getRepository(PurchaseOrderEntitySchema);
    return storeIds ? repository.createQueryBuilder("order").where("order.store_id IN (:...storeIds)", { storeIds }).orderBy("order.created_at", "DESC").getMany() : repository.find({ order: { createdAt: "DESC" } });
  }

  async receive(id: string, storeIds?: readonly string[] | null): Promise<PurchaseOrder | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(PurchaseOrderEntitySchema);
      const order = await orderRepository.findOneBy({ id });
      if (!order) return undefined;
      if (storeIds && !storeIds.includes(order.storeId)) return undefined;
      if (order.status === "received") throw new Error("Purchase order already received");
      if (order.status === "cancelled") throw new Error("Cancelled purchase order cannot be received");
      const stockRepository = manager.getRepository(StoreInventoryStockEntitySchema);
      const movementRepository = manager.getRepository(InventoryMovementEntitySchema);
      for (const line of order.lines) {
        const stock = await stockRepository.findOneBy({ storeId: order.storeId, inventoryItemId: line.inventoryItemId });
        if (!stock) throw new Error(`Inventory stock is not configured for item: ${line.inventoryItemId}`);
        stock.stock += line.quantity;
        await stockRepository.save(stock);
        await movementRepository.save({ id: randomUUID(), storeId: order.storeId, inventoryItemId: line.inventoryItemId, repairOrderId: null, quantity: line.quantity, type: "receipt", note: `Compra ${order.id}` });
      }
      order.status = "received";
      order.receivedAt = new Date();
      return orderRepository.save(order);
    });
  }
}
