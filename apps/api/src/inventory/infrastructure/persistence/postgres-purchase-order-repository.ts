import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { CreatePurchaseOrderInput, PurchaseOrder } from "../../domain/purchase-order.js";
import type { PurchaseOrderRepository } from "../../application/purchase-order-repository.js";
import { InventoryItemEntitySchema, InventoryMovementEntitySchema } from "./inventory-entity.js";
import { PurchaseOrderEntitySchema } from "./purchase-order-entity.js";

@Traceable("PostgresPurchaseOrderRepository")
@Service({ name: "purchaseOrderRepository" })
export class PostgresPurchaseOrderRepository implements PurchaseOrderRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  create(input: CreatePurchaseOrderInput & { id: string }): Promise<PurchaseOrder> {
    return this.dataSource.getRepository(PurchaseOrderEntitySchema).save({ ...input, status: "draft", lines: input.lines.map((line) => ({ ...line, id: randomUUID() })) });
  }

  findAll(): Promise<readonly PurchaseOrder[]> {
    return this.dataSource.getRepository(PurchaseOrderEntitySchema).find({ order: { createdAt: "DESC" } });
  }

  async receive(id: string): Promise<PurchaseOrder | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(PurchaseOrderEntitySchema);
      const order = await orderRepository.findOneBy({ id });
      if (!order) return undefined;
      if (order.status === "received") throw new Error("Purchase order already received");
      if (order.status === "cancelled") throw new Error("Cancelled purchase order cannot be received");
      const itemRepository = manager.getRepository(InventoryItemEntitySchema);
      const movementRepository = manager.getRepository(InventoryMovementEntitySchema);
      for (const line of order.lines) {
        const item = await itemRepository.findOneBy({ id: line.inventoryItemId });
        if (!item) throw new Error(`Inventory item not found: ${line.inventoryItemId}`);
        item.stock += line.quantity;
        await itemRepository.save(item);
        await movementRepository.save({ id: randomUUID(), inventoryItemId: item.id, repairOrderId: null, quantity: line.quantity, type: "receipt", note: `Compra ${order.id}` });
      }
      order.status = "received";
      order.receivedAt = new Date();
      return orderRepository.save(order);
    });
  }
}
