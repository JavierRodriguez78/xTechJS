import { Service } from "@xtaskjs/core";
import { CommandHandler, QueryHandler, type ICommandHandler, type IQueryHandler } from "@xtaskjs/cqrs";
import type { InventoryItem } from "../../domain/inventory-item.js";
import type { SupplierCatalogItem, SupplierCatalogPage } from "../../domain/supplier-catalog-item.js";
import { SupplierCatalogService, type SupplierCatalogImportResult } from "../supplier-catalog-service.js";
import { CreateInventoryItemFromSupplierCatalogCommand, GetSupplierCatalogItemQuery, ImportSupplierCatalogCommand, LinkSupplierCatalogItemCommand, ListSupplierCatalogQuery } from "./supplier-catalog-messages.js";

@Service()
@CommandHandler(ImportSupplierCatalogCommand)
export class ImportSupplierCatalogHandler implements ICommandHandler<ImportSupplierCatalogCommand, SupplierCatalogImportResult> {
  constructor(private readonly service: SupplierCatalogService) {}
  execute(command: ImportSupplierCatalogCommand): Promise<SupplierCatalogImportResult> { return this.service.importBatch(command.supplier, command.items); }
}

@Service()
@QueryHandler(ListSupplierCatalogQuery)
export class ListSupplierCatalogHandler implements IQueryHandler<ListSupplierCatalogQuery, SupplierCatalogPage> {
  constructor(private readonly service: SupplierCatalogService) {}
  execute(query: ListSupplierCatalogQuery): Promise<SupplierCatalogPage> { return this.service.findPage(query.options); }
}

@Service()
@QueryHandler(GetSupplierCatalogItemQuery)
export class GetSupplierCatalogItemHandler implements IQueryHandler<GetSupplierCatalogItemQuery, SupplierCatalogItem | undefined> {
  constructor(private readonly service: SupplierCatalogService) {}
  execute(query: GetSupplierCatalogItemQuery): Promise<SupplierCatalogItem | undefined> { return this.service.findById(query.id); }
}

@Service()
@CommandHandler(LinkSupplierCatalogItemCommand)
export class LinkSupplierCatalogItemHandler implements ICommandHandler<LinkSupplierCatalogItemCommand, SupplierCatalogItem | undefined> {
  constructor(private readonly service: SupplierCatalogService) {}
  execute(command: LinkSupplierCatalogItemCommand): Promise<SupplierCatalogItem | undefined> { return this.service.linkInventoryItem(command.id, command.inventoryItemId); }
}

@Service()
@CommandHandler(CreateInventoryItemFromSupplierCatalogCommand)
export class CreateInventoryItemFromSupplierCatalogHandler implements ICommandHandler<CreateInventoryItemFromSupplierCatalogCommand, { catalogItem: SupplierCatalogItem; inventoryItem: InventoryItem } | undefined> {
  constructor(private readonly service: SupplierCatalogService) {}
  execute(command: CreateInventoryItemFromSupplierCatalogCommand): Promise<{ catalogItem: SupplierCatalogItem; inventoryItem: InventoryItem } | undefined> { return this.service.createInventoryItem(command.id, { sku: command.sku }, command.storeIds); }
}
