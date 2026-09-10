import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { InventoryItem, InventoryMovement } from "../../domain/inventory-item.js";
import { AdjustInventoryStock } from "../adjust-inventory-stock.js";
import { CreateInventoryItem } from "../create-inventory-item.js";
import { GetInventoryMovements } from "../get-inventory-movements.js";
import { ListInventoryItems } from "../list-inventory-items.js";
import { AdjustInventoryStockCommand, CreateInventoryItemCommand, GetInventoryMovementsQuery, ListInventoryItemsQuery } from "./inventory-messages.js";

@Service()
@CommandHandler(CreateInventoryItemCommand)
export class CreateInventoryItemHandler implements ICommandHandler<CreateInventoryItemCommand, InventoryItem> {
  constructor(private readonly useCase: CreateInventoryItem) {}
  execute(command: CreateInventoryItemCommand): Promise<InventoryItem> { return this.useCase.execute(command.input); }
}

@Service()
@CommandHandler(AdjustInventoryStockCommand)
export class AdjustInventoryStockHandler implements ICommandHandler<AdjustInventoryStockCommand, InventoryItem | undefined> {
  constructor(private readonly useCase: AdjustInventoryStock) {}
  execute(command: AdjustInventoryStockCommand): Promise<InventoryItem | undefined> { return this.useCase.execute(command.id, command.input); }
}

@Service()
@QueryHandler(ListInventoryItemsQuery)
export class ListInventoryItemsHandler implements IQueryHandler<ListInventoryItemsQuery, readonly InventoryItem[]> {
  constructor(private readonly useCase: ListInventoryItems) {}
  execute(): Promise<readonly InventoryItem[]> { return this.useCase.execute(); }
}

@Service()
@QueryHandler(GetInventoryMovementsQuery)
export class GetInventoryMovementsHandler implements IQueryHandler<GetInventoryMovementsQuery, readonly InventoryMovement[]> {
  constructor(private readonly useCase: GetInventoryMovements) {}
  execute(query: GetInventoryMovementsQuery): Promise<readonly InventoryMovement[]> { return this.useCase.execute(query.id); }
}
