import type { InventoryItem } from "../../domain/inventory-item.js";
import type { SupplierCatalogItem, SupplierCatalogItemInput, SupplierCatalogPage, SupplierCatalogSearchOptions } from "../../domain/supplier-catalog-item.js";
import type { ExternalSupplierInput, SupplierCatalogImportResult } from "../supplier-catalog-service.js";

export class ImportSupplierCatalogCommand {
  constructor(public readonly supplier: ExternalSupplierInput, public readonly items: readonly SupplierCatalogItemInput[]) {}
}
export class ListSupplierCatalogQuery { constructor(public readonly options: SupplierCatalogSearchOptions) {} }
export class GetSupplierCatalogItemQuery { constructor(public readonly id: string) {} }
export class LinkSupplierCatalogItemCommand { constructor(public readonly id: string, public readonly inventoryItemId: string) {} }
export class CreateInventoryItemFromSupplierCatalogCommand { constructor(public readonly id: string, public readonly sku?: string, public readonly storeIds?: readonly string[] | null) {} }

export type SupplierCatalogImportResponse = SupplierCatalogImportResult;
export type SupplierCatalogListResponse = SupplierCatalogPage;
export type SupplierCatalogDetailResponse = SupplierCatalogItem | undefined;
export type SupplierCatalogLinkResponse = SupplierCatalogItem | undefined;
export type SupplierCatalogCreateInventoryResponse = { catalogItem: SupplierCatalogItem; inventoryItem: InventoryItem } | undefined;