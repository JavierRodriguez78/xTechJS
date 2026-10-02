export type StockTransferStatus = "draft" | "completed" | "cancelled";

export interface StockTransferLine {
  inventoryItemId: string;
  quantity: number;
}

export interface StockTransferOrder {
  id: string;
  originStoreId: string;
  destinationStoreId: string;
  status: StockTransferStatus;
  note: string | null;
  createdByUserId: string;
  createdAt: Date;
  completedAt: Date | null;
}