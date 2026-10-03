import assert from "node:assert/strict";
import test from "node:test";
import { SupplierEntitySchema } from "../infrastructure/persistence/supplier-entity.js";
import { SupplierCatalogItemEntitySchema } from "../infrastructure/persistence/supplier-catalog-item-entity.js";
import { SupplierCatalogService } from "./supplier-catalog-service.js";

function harness() {
  let supplier: Record<string, unknown> | null = null;
  const items = new Map<string, Record<string, unknown>>();
  let inventoryCreations = 0;
  const manager = { getRepository(schema: unknown) {
    if (schema === SupplierEntitySchema) return {
      async findOneBy(where: Record<string, unknown>) { return supplier && Object.entries(where).every(([key, value]) => supplier?.[key] === value) ? supplier : null; },
      async save(input: Record<string, unknown>) { supplier = { ...supplier, ...input }; return supplier; }
    };
    return {
      async findOneBy(where: Record<string, unknown>) { return items.get(String(where.externalRef)) ?? null; },
      async save(input: Record<string, unknown>) { items.set(String(input.externalRef), { ...input }); return input; }
    };
  } };
  const dataSource = { async transaction<T>(operation: (transactionManager: typeof manager) => Promise<T>): Promise<T> { return operation(manager); } };
  const createInventoryItem = { async execute() { inventoryCreations += 1; return { id: "inventory-1" }; } };
  const service = new SupplierCatalogService(createInventoryItem as never);
  (service as unknown as { dataSource: unknown }).dataSource = dataSource;
  return { service, items, inventoryCreations: () => inventoryCreations };
}

const supplier = { externalRef: "part-store.example", name: "Part Store" };
const part = { externalRef: "SKU-123", name: "iPhone 12 display", category: "screen", brand: "Apple", compatibleModels: ["iPhone 12"], sku: "123", priceCents: 4590, currency: "EUR", availability: "in_stock" as const, url: "https://parts.example/item/123", capturedAt: new Date("2026-10-03T10:00:00Z") };

test("catalog import upserts by supplier and external reference without creating stock", async () => {
  const { service, items, inventoryCreations } = harness();

  const first = await service.importBatch(supplier, [part]);
  assert.equal(first.supplierCreated, true);
  assert.equal(first.created, 1);
  assert.equal(first.updated, 0);
  assert.equal(items.get("SKU-123")?.inventoryItemId, null);
  assert.equal(inventoryCreations(), 0);

  const second = await service.importBatch({ ...supplier, name: "Part Store Updated" }, [{ ...part, priceCents: 4990, capturedAt: new Date("2026-10-03T11:00:00Z") }]);
  assert.equal(second.supplierCreated, false);
  assert.equal(second.created, 0);
  assert.equal(second.updated, 1);
  assert.equal(second.supplier.name, "Part Store Updated");
  assert.equal(items.size, 1);
  assert.equal(items.get("SKU-123")?.priceCents, 4990);
  assert.equal(inventoryCreations(), 0);
});
