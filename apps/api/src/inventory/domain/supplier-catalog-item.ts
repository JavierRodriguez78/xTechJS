export type CatalogItemAvailability = "in_stock" | "out_of_stock" | "unknown";

export interface SupplierCatalogItem {
  id: string;
  supplierId: string;
  externalRef: string;
  name: string;
  category: string | null;
  brand: string | null;
  compatibleModels: string[];
  sku: string | null;
  priceCents: number;
  currency: string;
  availability: CatalogItemAvailability;
  url: string;
  capturedAt: Date;
  inventoryItemId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierCatalogItemInput {
  externalRef: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  compatibleModels?: string[];
  sku?: string | null;
  priceCents: number;
  currency?: string;
  availability?: CatalogItemAvailability;
  url: string;
  capturedAt: Date;
}

export interface SupplierCatalogSearchOptions {
  query?: string;
  supplierId?: string;
  category?: string;
  brand?: string;
  model?: string;
  availability?: CatalogItemAvailability;
  priceMin?: number;
  priceMax?: number;
  page: number;
  pageSize: number;
}

export interface SupplierCatalogPage {
  items: readonly SupplierCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
}
