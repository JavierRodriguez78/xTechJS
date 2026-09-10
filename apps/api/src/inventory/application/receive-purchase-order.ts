import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { PurchaseOrder } from "../domain/purchase-order.js";
import type { PurchaseOrderRepository } from "./purchase-order-repository.js";

@Traceable("ReceivePurchaseOrder")
@Service()
export class ReceivePurchaseOrder {
  constructor(@Qualifier("purchaseOrderRepository") private readonly repository: PurchaseOrderRepository) {}
  execute(id: string): Promise<PurchaseOrder | undefined> { return this.repository.receive(id); }
}