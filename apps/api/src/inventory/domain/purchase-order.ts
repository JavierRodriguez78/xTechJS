export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";

export interface PurchaseOrderLine {
  id: string;
  inventoryItemId: string;
  quantity: number;
  unitCostCents: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  createdAt: Date;
  receivedAt: Date | null;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  lines: Array<{ inventoryItemId: string; quantity: number; unitCostCents: number }>;
}