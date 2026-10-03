import type { CreatePurchaseOrderInput } from "../../domain/purchase-order.js";
export class CreatePurchaseOrderCommand { constructor(public readonly input: CreatePurchaseOrderInput) {} }
export class ListPurchaseOrdersQuery { constructor(public readonly storeIds?: readonly string[] | null) {} }
export class ReceivePurchaseOrderCommand { constructor(public readonly id: string, public readonly storeIds?: readonly string[] | null) {} }
