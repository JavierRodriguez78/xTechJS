import assert from "node:assert/strict";
import test from "node:test";
import type { Supplier, UpdateSupplierInput } from "../domain/supplier.js";
import type { SupplierRepository } from "./supplier-repository.js";
import { DeactivateSupplier } from "./deactivate-supplier.js";
import { ReactivateSupplier } from "./reactivate-supplier.js";
import { UpdateSupplier } from "./update-supplier.js";

const supplier: Supplier = {
  id: "supplier-1", name: "Parts Co", email: "parts@example.test", phone: null, secondaryPhone: null,
  notes: null, externalRef: null, website: null, legalName: null, taxId: null, addressStreet: null,
  addressPostalCode: null, addressCity: null, addressProvince: null, addressCountry: null,
  paymentTermDays: null, category: null, active: true, deactivatedAt: null, createdAt: new Date(), updatedAt: new Date()
};

test("supplier updates normalize text and preserve explicit clearing", async () => {
  let received: UpdateSupplierInput | undefined;
  const repository = {
    update: async (_id: string, input: UpdateSupplierInput) => { received = input; return supplier; }
  } as SupplierRepository;

  await new UpdateSupplier(repository).execute(supplier.id, {
    name: "  Parts Co  ", email: " SALES@EXAMPLE.TEST ", taxId: " es123 ", legalName: "  ", category: null
  });

  assert.deepEqual(received, { name: "Parts Co", email: "sales@example.test", taxId: "ES123", legalName: null, category: null });
});

test("supplier status changes delegate to explicit repository operations", async () => {
  const calls: string[] = [];
  const repository = {
    deactivate: async (id: string) => { calls.push(`deactivate:${id}`); return supplier; },
    reactivate: async (id: string) => { calls.push(`reactivate:${id}`); return supplier; }
  } as SupplierRepository;
  await new DeactivateSupplier(repository).execute(supplier.id);
  await new ReactivateSupplier(repository).execute(supplier.id);

  assert.deepEqual(calls, ["deactivate:supplier-1", "reactivate:supplier-1"]);
});
