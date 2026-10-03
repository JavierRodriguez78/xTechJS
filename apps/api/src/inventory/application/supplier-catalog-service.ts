import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Supplier } from "../domain/supplier.js";
import type { SupplierCatalogItem, SupplierCatalogItemInput, SupplierCatalogPage, SupplierCatalogSearchOptions } from "../domain/supplier-catalog-item.js";
import type { InventoryItem } from "../domain/inventory-item.js";
import { CreateInventoryItem } from "./create-inventory-item.js";
import { InventoryItemEntitySchema } from "../infrastructure/persistence/inventory-entity.js";
import { SupplierCatalogItemEntitySchema } from "../infrastructure/persistence/supplier-catalog-item-entity.js";
import { SupplierEntitySchema } from "../infrastructure/persistence/supplier-entity.js";

export interface ExternalSupplierInput { externalRef: string; name: string; website?: string; email?: string; phone?: string; }
export interface SupplierCatalogImportResult { supplier: Supplier; supplierCreated: boolean; created: number; updated: number; }
export class SupplierCatalogUniqueConflictError extends Error {}

@Traceable("SupplierCatalogService")
@Service()
export class SupplierCatalogService {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  constructor(private readonly createInventoryItemUseCase: CreateInventoryItem) {}

  async importBatch(supplierInput: ExternalSupplierInput, items: readonly SupplierCatalogItemInput[]): Promise<SupplierCatalogImportResult> {
    try {
      return await this.dataSource.transaction(async (manager) => {
      const supplierRepository = manager.getRepository(SupplierEntitySchema);
      const externalRef = supplierInput.externalRef.trim().toLowerCase();
      let supplier = await supplierRepository.findOneBy({ externalRef });
      const supplierCreated = !supplier;
      if (supplier) {
        supplier = await supplierRepository.save({
          ...supplier,
          name: supplierInput.name.trim(),
          website: supplierInput.website?.trim() ?? supplier.website,
          email: supplierInput.email?.trim().toLowerCase() ?? supplier.email,
          phone: supplierInput.phone?.trim() ?? supplier.phone
        });
      } else {
        supplier = await supplierRepository.save({
          id: randomUUID(),
          externalRef,
          name: supplierInput.name.trim(),
          website: supplierInput.website?.trim() || null,
          email: supplierInput.email?.trim().toLowerCase() || null,
          phone: supplierInput.phone?.trim() || null,
          notes: null
        });
      }

      const catalogRepository = manager.getRepository(SupplierCatalogItemEntitySchema);
      let created = 0;
      let updated = 0;
      for (const input of items) {
        const externalItemRef = input.externalRef.trim();
        const existing = await catalogRepository.findOneBy({ supplierId: supplier.id, externalRef: externalItemRef });
        const next = {
          id: existing?.id ?? randomUUID(),
          supplierId: supplier.id,
          externalRef: externalItemRef,
          name: input.name.trim(),
          category: input.category?.trim() || null,
          brand: input.brand?.trim() || null,
          compatibleModels: [...new Set(input.compatibleModels?.map((model) => model.trim()).filter(Boolean) ?? [])],
          sku: input.sku?.trim() || null,
          priceCents: input.priceCents,
          currency: input.currency?.toUpperCase() ?? "EUR",
          availability: input.availability ?? "unknown",
          url: input.url,
          capturedAt: input.capturedAt,
          inventoryItemId: existing?.inventoryItemId ?? null,
          createdAt: existing?.createdAt ?? new Date(),
          updatedAt: new Date()
        };
        await catalogRepository.save(next);
        if (existing) updated += 1;
        else created += 1;
      }
      return { supplier, supplierCreated, created, updated };
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") throw new SupplierCatalogUniqueConflictError("Supplier or catalog reference conflicts with an existing record");
      throw error;
    }
  }

  async findPage(options: SupplierCatalogSearchOptions): Promise<SupplierCatalogPage> {
    const query = this.dataSource.getRepository(SupplierCatalogItemEntitySchema).createQueryBuilder("catalog");
    if (options.query) query.andWhere("(catalog.name ILIKE :query OR catalog.sku ILIKE :query OR catalog.category ILIKE :query OR catalog.brand ILIKE :query OR catalog.compatible_models::text ILIKE :query OR EXISTS (SELECT 1 FROM inventory_suppliers supplier WHERE supplier.id = catalog.supplier_id AND supplier.name ILIKE :query))", { query: `%${options.query}%` });
    if (options.supplierId) query.andWhere("catalog.supplier_id = :supplierId", { supplierId: options.supplierId });
    if (options.category) query.andWhere("catalog.category ILIKE :category", { category: options.category });
    if (options.brand) query.andWhere("catalog.brand ILIKE :brand", { brand: `%${options.brand}%` });
    if (options.model) query.andWhere("catalog.compatible_models @> :model", { model: JSON.stringify([options.model]) });
    if (options.availability) query.andWhere("catalog.availability = :availability", { availability: options.availability });
    if (options.priceMin !== undefined) query.andWhere("catalog.price_cents >= :priceMin", { priceMin: options.priceMin });
    if (options.priceMax !== undefined) query.andWhere("catalog.price_cents <= :priceMax", { priceMax: options.priceMax });
    query.orderBy("catalog.captured_at", "DESC").addOrderBy("catalog.name", "ASC");
    const [items, total] = await query.skip((options.page - 1) * options.pageSize).take(options.pageSize).getManyAndCount();
    return { items, total, page: options.page, pageSize: options.pageSize };
  }

  findById(id: string): Promise<SupplierCatalogItem | undefined> {
    return this.dataSource.getRepository(SupplierCatalogItemEntitySchema).findOneBy({ id }).then((item) => item ?? undefined);
  }

  async linkInventoryItem(id: string, inventoryItemId: string): Promise<SupplierCatalogItem | undefined> {
    const repository = this.dataSource.getRepository(SupplierCatalogItemEntitySchema);
    const item = await repository.findOneBy({ id });
    if (!item) return undefined;
    item.inventoryItemId = inventoryItemId;
    return repository.save(item);
  }

  async createInventoryItem(id: string, options: { sku?: string }, storeIds?: readonly string[] | null): Promise<{ catalogItem: SupplierCatalogItem; inventoryItem: InventoryItem } | undefined> {
    const catalogItem = await this.findById(id);
    if (!catalogItem) return undefined;
    const inventoryRepository = this.dataSource.getRepository(InventoryItemEntitySchema);
    if (catalogItem.inventoryItemId) {
      const inventoryItem = await inventoryRepository.findOneBy({ id: catalogItem.inventoryItemId });
      if (inventoryItem) return { catalogItem, inventoryItem };
    }
    const description = [catalogItem.brand, catalogItem.category, catalogItem.compatibleModels.length ? `Compatible con: ${catalogItem.compatibleModels.join(", ")}` : undefined, catalogItem.url].filter(Boolean).join(" · ").slice(0, 2000);
    const inventoryItem = await this.createInventoryItemUseCase.execute({
      sku: options.sku?.trim() || `SUP-${catalogItem.id.replace(/-/g, "").slice(0, 12).toUpperCase()}`,
      name: catalogItem.name.slice(0, 180),
      description,
      unit: "unidad",
      minimumStock: 0,
      salePriceCents: catalogItem.priceCents
    }, storeIds);
    const linked = await this.linkInventoryItem(id, inventoryItem.id);
    if (!linked) return undefined;
    return { catalogItem: linked, inventoryItem };
  }
}
