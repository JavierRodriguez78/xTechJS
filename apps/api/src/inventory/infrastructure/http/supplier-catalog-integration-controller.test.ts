import assert from "node:assert/strict";
import test from "node:test";
import { SupplierCatalogIntegrationController } from "./supplier-catalog-integration-controller.js";

function reply() {
  const result: { status?: number; payload?: unknown } = {};
  return { result, code(status: number) { result.status = status; return this; }, send(payload: unknown) { result.payload = payload; return payload; } };
}

function createController(options: { authorized: boolean }) {
  let command: unknown;
  const commandBus = { async execute(input: unknown) { command = input; return { supplier: { id: "supplier-1" }, supplierCreated: true, created: 1, updated: 0 }; } };
  const guard = { async authorize() { return options.authorized; } };
  return { controller: new SupplierCatalogIntegrationController(commandBus as never, guard as never), command: () => command };
}

const supplier = { externalRef: "parts.example", name: "Parts Example" };
const validItem = { externalRef: "SKU-1", name: "Display", priceCents: 4590, url: "https://parts.example/p/SKU-1", capturedAt: "2026-10-03T10:15:00Z" };

test("rejects requests without a valid machine API key using a generic 401", async () => {
  const { controller } = createController({ authorized: false });
  const response = reply();

  await controller.importCatalog({ supplier, items: [validItem] }, { headers: {} } as never, response);

  assert.equal(response.result.status, 401);
  assert.deepEqual(response.result.payload, { message: "Unauthorized" });
});

test("imports valid records and reports invalid items without rejecting the batch", async () => {
  const { controller, command } = createController({ authorized: true });
  const response = reply();

  await controller.importCatalog({ supplier, items: [validItem, { externalRef: "bad", name: "Missing URL and price" }] }, { headers: { "x-api-key": "secret" } } as never, response);

  assert.equal(response.result.status, 201);
  assert.deepEqual(response.result.payload, { supplierId: "supplier-1", created: 1, updated: 0, skipped: 1, errors: [{ index: 1, errors: { formErrors: [], fieldErrors: { priceCents: ["Required"], url: ["Required"], capturedAt: ["Required"] } } }] });
  assert.equal((command() as { items: unknown[] }).items.length, 1);
});
