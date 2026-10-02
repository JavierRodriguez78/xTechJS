export type StockTransferStatus = "draft" | "in_transit" | "received" | "cancelled";

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
  sentAt: Date | null;
  receivedAt: Date | null;
}