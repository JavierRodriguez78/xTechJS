import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { PurchaseOrder } from "../../domain/purchase-order.js";
import { CreatePurchaseOrder } from "../create-purchase-order.js";
import { ListPurchaseOrders } from "../list-purchase-orders.js";
import { ReceivePurchaseOrder } from "../receive-purchase-order.js";
import { CreatePurchaseOrderCommand, ListPurchaseOrdersQuery, ReceivePurchaseOrderCommand } from "./purchase-order-messages.js";

@Service()
@CommandHandler(CreatePurchaseOrderCommand)
export class CreatePurchaseOrderHandler implements ICommandHandler<CreatePurchaseOrderCommand, PurchaseOrder> {
  constructor(private readonly useCase: CreatePurchaseOrder) {}
  execute(command: CreatePurchaseOrderCommand): Promise<PurchaseOrder> { return this.useCase.execute(command.input); }
}

@Service()
@QueryHandler(ListPurchaseOrdersQuery)
export class ListPurchaseOrdersHandler implements IQueryHandler<ListPurchaseOrdersQuery, readonly PurchaseOrder[]> {
  constructor(private readonly useCase: ListPurchaseOrders) {}
  execute(): Promise<readonly PurchaseOrder[]> { return this.useCase.execute(); }
}

@Service()
@CommandHandler(ReceivePurchaseOrderCommand)
export class ReceivePurchaseOrderHandler implements ICommandHandler<ReceivePurchaseOrderCommand, PurchaseOrder | undefined> {
  constructor(private readonly useCase: ReceivePurchaseOrder) {}
  execute(command: ReceivePurchaseOrderCommand): Promise<PurchaseOrder | undefined> { return this.useCase.execute(command.id); }
}
