import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { StoreInventoryStockEntitySchema, InventoryMovementEntitySchema } from "../infrastructure/persistence/inventory-entity.js";
import { StockTransferLineEntitySchema, StockTransferOrderEntitySchema } from "../infrastructure/persistence/stock-transfer-entity.js";
import type { StockTransferLine, StockTransferOrder } from "../domain/stock-transfer.js";

@Service()
export class TransferStock {
  @InjectDataSource() private readonly dataSource!: DataSource;

  async execute(input: { originStoreId: string; destinationStoreId: string; lines: StockTransferLine[]; note?: string }, userId: string): Promise<StockTransferOrder> {
    if (input.originStoreId === input.destinationStoreId) throw new Error("Origin and destination stores must differ");
    if (!input.lines.length || input.lines.some((line) => !Number.isInteger(line.quantity) || line.quantity <= 0)) throw new Error("A transfer needs positive lines");
    if (new Set(input.lines.map((line) => line.inventoryItemId)).size !== input.lines.length) throw new Error("An inventory item can appear only once");
    return this.dataSource.transaction(async (manager) => {
      const transfer = await manager.getRepository(StockTransferOrderEntitySchema).save({ id: randomUUID(), originStoreId: input.originStoreId, destinationStoreId: input.destinationStoreId, status: "draft" as StockTransferOrder["status"], note: input.note?.trim() || null, createdByUserId: userId, completedAt: null as Date | null });
      await manager.getRepository(StockTransferLineEntitySchema).save(input.lines.map((line) => ({ transferId: transfer.id, ...line })));
      const stockRepository = manager.getRepository(StoreInventoryStockEntitySchema);
      const movementRepository = manager.getRepository(InventoryMovementEntitySchema);
      for (const line of input.lines) {
        const origin = await stockRepository.findOneBy({ storeId: input.originStoreId, inventoryItemId: line.inventoryItemId });
        const destination = await stockRepository.findOneBy({ storeId: input.destinationStoreId, inventoryItemId: line.inventoryItemId });
        if (!origin || !destination || origin.stock < line.quantity) throw new Error("Insufficient origin stock for transfer");
        origin.stock -= line.quantity; destination.stock += line.quantity;
        await stockRepository.save([origin, destination]);
        await movementRepository.save({ id: randomUUID(), storeId: input.originStoreId, inventoryItemId: line.inventoryItemId, repairOrderId: null, quantity: -line.quantity, type: "transfer_out", note: `Transfer ${transfer.id}` });
        await movementRepository.save({ id: randomUUID(), storeId: input.destinationStoreId, inventoryItemId: line.inventoryItemId, repairOrderId: null, quantity: line.quantity, type: "transfer_in", note: `Transfer ${transfer.id}` });
      }
      transfer.status = "completed"; transfer.completedAt = new Date();
      return manager.getRepository(StockTransferOrderEntitySchema).save(transfer);
    });
  }
}