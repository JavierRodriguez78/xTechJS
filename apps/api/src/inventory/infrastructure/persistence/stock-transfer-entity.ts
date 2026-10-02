import { EntitySchema } from "typeorm";
import type { StockTransferOrder } from "../../domain/stock-transfer.js";

export interface StockTransferLineEntity { transferId: string; inventoryItemId: string; quantity: number; }

export const StockTransferOrderEntitySchema = new EntitySchema<StockTransferOrder>({ name: "StockTransferOrder", tableName: "stock_transfer_orders", columns: { id: { type: "uuid", primary: true }, originStoreId: { type: "uuid", name: "origin_store_id" }, destinationStoreId: { type: "uuid", name: "destination_store_id" }, status: { type: String }, note: { type: String, nullable: true }, createdByUserId: { type: "uuid", name: "created_by_user_id" }, createdAt: { type: "timestamptz", name: "created_at", createDate: true }, completedAt: { type: "timestamptz", name: "completed_at", nullable: true } } });
export const StockTransferLineEntitySchema = new EntitySchema<StockTransferLineEntity>({ name: "StockTransferLine", tableName: "stock_transfer_lines", columns: { transferId: { type: "uuid", name: "transfer_id", primary: true }, inventoryItemId: { type: "uuid", name: "inventory_item_id", primary: true }, quantity: { type: Number } } });