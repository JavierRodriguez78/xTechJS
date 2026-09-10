import type { CreatePurchaseOrderInput, PurchaseOrder } from "../domain/purchase-order.js";

export interface PurchaseOrderRepository {
  create(input: CreatePurchaseOrderInput & { id: string }): Promise<PurchaseOrder>;
  findAll(): Promise<readonly PurchaseOrder[]>;
  receive(id: string): Promise<PurchaseOrder | undefined>;
}