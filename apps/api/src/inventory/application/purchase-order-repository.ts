import type { CreatePurchaseOrderInput, PurchaseOrder } from "../domain/purchase-order.js";

export interface PurchaseOrderRepository {
  create(input: CreatePurchaseOrderInput & { id: string }): Promise<PurchaseOrder>;
  findAll(storeIds?: readonly string[] | null): Promise<readonly PurchaseOrder[]>;
  receive(id: string, storeIds?: readonly string[] | null): Promise<PurchaseOrder | undefined>;
}