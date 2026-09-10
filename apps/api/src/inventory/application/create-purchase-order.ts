import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CreatePurchaseOrderInput, PurchaseOrder } from "../domain/purchase-order.js";
import type { PurchaseOrderRepository } from "./purchase-order-repository.js";

@Traceable("CreatePurchaseOrder")
@Service()
export class CreatePurchaseOrder {
  constructor(@Qualifier("purchaseOrderRepository") private readonly repository: PurchaseOrderRepository) {}

  execute(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    return this.repository.create({ ...input, id: randomUUID() });
  }
}