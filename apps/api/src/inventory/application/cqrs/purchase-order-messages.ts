import type { CreatePurchaseOrderInput } from "../../domain/purchase-order.js";
export class CreatePurchaseOrderCommand { constructor(public readonly input: CreatePurchaseOrderInput) {} }
export class ListPurchaseOrdersQuery {}
export class ReceivePurchaseOrderCommand { constructor(public readonly id: string) {} }
