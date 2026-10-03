import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { StoreInventoryStockEntitySchema, InventoryMovementEntitySchema } from "../infrastructure/persistence/inventory-entity.js";
import { StockTransferLineEntitySchema, StockTransferOrderEntitySchema } from "../infrastructure/persistence/stock-transfer-entity.js";
import type { StockTransferLine, StockTransferOrder } from "../domain/stock-transfer.js";

type StoreAccess = readonly string[] | null;

@Service()
export class TransferStock {
  @InjectDataSource() private readonly dataSource!: DataSource;

  async execute(input: { originStoreId: string; destinationStoreId: string; lines: StockTransferLine[]; note?: string }, userId: string): Promise<StockTransferOrder> {
    if (input.originStoreId === input.destinationStoreId) throw new Error("Origin and destination stores must differ");
    if (!input.lines.length || input.lines.some((line) => !Number.isInteger(line.quantity) || line.quantity <= 0)) throw new Error("A transfer needs positive lines");
    if (new Set(input.lines.map((line) => line.inventoryItemId)).size !== input.lines.length) throw new Error("An inventory item can appear only once");
    return this.dataSource.transaction(async (manager) => {
      const transfer = await manager.getRepository(StockTransferOrderEntitySchema).save({ id: randomUUID(), originStoreId: input.originStoreId, destinationStoreId: input.destinationStoreId, status: "draft" as StockTransferOrder["status"], note: input.note?.trim() || null, createdByUserId: userId, sentAt: null, receivedAt: null });
      await manager.getRepository(StockTransferLineEntitySchema).save(input.lines.map((line) => ({ transferId: transfer.id, ...line })));
      return transfer;
    });
  }

  async send(id: string, storeAccess: StoreAccess): Promise<StockTransferOrder> {
    return this.dataSource.transaction(async (manager) => {
      const transfer = await manager.getRepository(StockTransferOrderEntitySchema).findOneBy({ id });
      if (!transfer) throw new Error("Stock transfer not found");
      if (storeAccess && !storeAccess.includes(transfer.originStoreId)) throw new Error("You can only send transfers from a store you can access");
      if (transfer.status !== "draft") throw new Error("Only draft transfers can be sent");
      const lines = await manager.getRepository(StockTransferLineEntitySchema).findBy({ transferId: id });
      const stockRepository = manager.getRepository(StoreInventoryStockEntitySchema);
      const movementRepository = manager.getRepository(InventoryMovementEntitySchema);
      for (const line of lines) {
        const origin = await stockRepository.findOneBy({ storeId: transfer.originStoreId, inventoryItemId: line.inventoryItemId });
        if (!origin || origin.stock < line.quantity) throw new Error("Insufficient origin stock for transfer");
        origin.stock -= line.quantity;
        await stockRepository.save(origin);
        await movementRepository.save({ id: randomUUID(), storeId: transfer.originStoreId, inventoryItemId: line.inventoryItemId, repairOrderId: null, stockTransferOrderId: id, quantity: -line.quantity, type: "transfer_out", note: `Transfer ${id}` });
      }
      transfer.status = "in_transit";
      transfer.sentAt = new Date();
      return manager.getRepository(StockTransferOrderEntitySchema).save(transfer);
    });
  }

  async receive(id: string, storeAccess: StoreAccess): Promise<StockTransferOrder> {
    return this.dataSource.transaction(async (manager) => {
      const transfer = await manager.getRepository(StockTransferOrderEntitySchema).findOneBy({ id });
      if (!transfer) throw new Error("Stock transfer not found");
      if (storeAccess && !storeAccess.includes(transfer.destinationStoreId)) throw new Error("You can only receive transfers for a store you can access");
      if (transfer.status !== "in_transit") throw new Error("Only transfers in transit can be received");
      const lines = await manager.getRepository(StockTransferLineEntitySchema).findBy({ transferId: id });
      const stockRepository = manager.getRepository(StoreInventoryStockEntitySchema);
      const movementRepository = manager.getRepository(InventoryMovementEntitySchema);
      for (const line of lines) {
        const destination = await stockRepository.findOneBy({ storeId: transfer.destinationStoreId, inventoryItemId: line.inventoryItemId });
        if (!destination) throw new Error("Inventory stock is not configured for the destination store");
        destination.stock += line.quantity;
        await stockRepository.save(destination);
        await movementRepository.save({ id: randomUUID(), storeId: transfer.destinationStoreId, inventoryItemId: line.inventoryItemId, repairOrderId: null, stockTransferOrderId: id, quantity: line.quantity, type: "transfer_in", note: `Transfer ${id}` });
      }
      transfer.status = "received";
      transfer.receivedAt = new Date();
      return manager.getRepository(StockTransferOrderEntitySchema).save(transfer);
    });
  }

  async cancel(id: string, storeAccess: StoreAccess): Promise<StockTransferOrder> {
    const transfer = await this.dataSource.getRepository(StockTransferOrderEntitySchema).findOneBy({ id });
    if (!transfer) throw new Error("Stock transfer not found");
    if (storeAccess && !storeAccess.includes(transfer.originStoreId)) throw new Error("You can only cancel transfers from a store you can access");
    if (transfer.status !== "draft") throw new Error("Only draft transfers can be cancelled");
    transfer.status = "cancelled";
    return this.dataSource.getRepository(StockTransferOrderEntitySchema).save(transfer);
  }

  async list(storeAccess: StoreAccess): Promise<Array<StockTransferOrder & { lines: StockTransferLine[] }>> {
    const repository = this.dataSource.getRepository(StockTransferOrderEntitySchema);
    if (storeAccess?.length === 0) return [];
    const transfers = storeAccess ? await repository.createQueryBuilder("transfer").where("transfer.origin_store_id IN (:...storeAccess) OR transfer.destination_store_id IN (:...storeAccess)", { storeAccess }).orderBy("transfer.created_at", "DESC").getMany() : await repository.find({ order: { createdAt: "DESC" } });
    const lines = await this.dataSource.getRepository(StockTransferLineEntitySchema).find();
    return transfers.map((transfer) => ({ ...transfer, lines: lines.filter((line) => line.transferId === transfer.id) }));
  }
}