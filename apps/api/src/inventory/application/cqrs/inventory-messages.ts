import type { AdjustInventoryInput, CreateInventoryItemInput } from "../../domain/inventory-item.js";

export class CreateInventoryItemCommand { constructor(public readonly input: CreateInventoryItemInput) {} }
export class AdjustInventoryStockCommand { constructor(public readonly id: string, public readonly input: AdjustInventoryInput) {} }
export class ListInventoryItemsQuery {}
export class GetInventoryMovementsQuery { constructor(public readonly id: string) {} }
