import assert from "node:assert/strict";
import test from "node:test";
import { assertRequiredComponents } from "./app.js";

test("startup smoke check resolves every required repository", () => {
  const resolved: string[] = [];
  assertRequiredComponents({ getByName<T>(name: string) { resolved.push(name); return {} as T; } });
  assert.deepEqual(resolved, ["userRepository", "customerRepository", "repairOrderRepository", "repairQuoteRepository", "inventoryRepository", "supplierRepository", "purchaseOrderRepository", "paymentRepository", "cashRegisterRepository"]);
});

test("startup smoke check fails when a required repository is unavailable", () => {
  assert.throws(() => assertRequiredComponents({ getByName(name: string) {
    if (name === "repairQuoteRepository") throw new Error(`No component found with name: ${name}`);
    return {} as never;
  } }), /repairQuoteRepository/);
});