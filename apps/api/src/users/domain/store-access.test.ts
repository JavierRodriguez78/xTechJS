import assert from "node:assert/strict";
import test from "node:test";
import { canAccessStore, getStoreAccess, isGlobalAdministrator, toStoreAccessClaims } from "./store-access.js";

test("scoped technicians can access only stores in their assigned list", () => {
  const user = { role: "technician", defaultStoreId: "store-a", storeAccess: ["store-a", "store-b"] };
  assert.deepEqual(getStoreAccess(user), ["store-a", "store-b"]);
  assert.equal(canAccessStore(user, "store-b"), true);
  assert.equal(canAccessStore(user, "store-c"), false);
});

test("global admins use null as the open-ended scope and limited admins stay scoped", () => {
  assert.equal(getStoreAccess({ role: "admin", defaultStoreId: null, storeAccess: null }), null);
  assert.deepEqual(getStoreAccess({ role: "admin", defaultStoreId: "store-a", storeAccess: ["store-a"] }), ["store-a"]);
  assert.equal(canAccessStore({ role: "admin", defaultStoreId: "store-a", storeAccess: ["store-a"] }, "store-b"), false);
  assert.equal(isGlobalAdministrator({ role: "admin", defaultStoreId: "store-a", storeAccess: null }), true);
  assert.equal(isGlobalAdministrator({ role: "admin", defaultStoreId: "store-a", storeAccess: ["store-a"] }), false);
});

test("legacy tokens keep their single-store scope and unassigned technicians fail closed", () => {
  assert.deepEqual(getStoreAccess({ role: "technician", storeId: "store-a" }), ["store-a"]);
  assert.deepEqual(getStoreAccess({ role: "technician", storeId: null }), []);
  assert.equal(canAccessStore({ role: "technician", storeId: null }, "store-a"), false);
});

test("token migration uses the default store as a legacy claim without widening access", () => {
  assert.deepEqual(toStoreAccessClaims({ role: "technician", defaultStoreId: "store-a", storeAccess: ["store-a", "store-b"] }), {
    defaultStoreId: "store-a", storeAccess: ["store-a", "store-b"], storeId: "store-a"
  });
  assert.deepEqual(toStoreAccessClaims({ role: "admin", storeId: null }), { defaultStoreId: null, storeAccess: null, storeId: null });
});