import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission, PERMISSIONS } from "./permission.js";

test("an administrator can manage users", () => {
  assert.equal(hasPermission("admin", PERMISSIONS.usersManage), true);
});

test("a technician can manage store operations but not global user management", () => {
  assert.equal(hasPermission("technician", PERMISSIONS.inventoryManage), true);
  assert.equal(hasPermission("technician", PERMISSIONS.inventoryTransfer), true);
  assert.equal(hasPermission("technician", PERMISSIONS.paymentsManage), true);
  assert.equal(hasPermission("technician", PERMISSIONS.tradeInManage), false);
  assert.equal(hasPermission("technician", PERMISSIONS.usersManage), false);
});

test("a customer can view repairs but cannot manage them", () => {
  assert.equal(hasPermission("customer", PERMISSIONS.repairsRead), true);
  assert.equal(hasPermission("customer", PERMISSIONS.repairsManage), false);
});