import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { PurchaseOrder } from "../domain/purchase-order.js";
import type { PurchaseOrderRepository } from "./purchase-order-repository.js";

@Traceable("ListPurchaseOrders")
@Service()
export class ListPurchaseOrders {
  constructor(@Qualifier("purchaseOrderRepository") private readonly repository: PurchaseOrderRepository) {}
  execute(): Promise<readonly PurchaseOrder[]> { return this.repository.findAll(); }
}