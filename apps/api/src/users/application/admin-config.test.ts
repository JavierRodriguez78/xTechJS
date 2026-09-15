import assert from "node:assert/strict";
import test from "node:test";
import { AdminConfigService } from "./admin-config.js";

test("repair statuses can be added and removed", async () => {
  const service = new AdminConfigService();

  await service.addRepairStatus("awaiting-parts");
  assert.deepEqual(await service.listRepairStatuses(), [
    "received",
    "diagnosing",
    "quoted",
    "approved",
    "repairing",
    "testing",
    "repaired",
    "delivered",
    "unrepairable",
    "cancelled",
    "awaiting-parts"
  ]);

  await service.removeRepairStatus("awaiting-parts");
  assert.equal((await service.listRepairStatuses()).includes("awaiting-parts"), false);
});

test("device types can be added and removed", async () => {
  const service = new AdminConfigService();

  await service.addDeviceType("Tablet");
  assert.equal((await service.listDeviceTypes()).includes("Tablet"), true);

  await service.removeDeviceType("Tablet");
  assert.equal((await service.listDeviceTypes()).includes("Tablet"), false);
});

test("notification templates can be added and removed", async () => {
  const service = new AdminConfigService();

  await service.addNotificationTemplate("repair.completed");
  assert.equal((await service.listNotificationTemplates()).includes("repair.completed"), true);

  await service.removeNotificationTemplate("repair.completed");
  assert.equal((await service.listNotificationTemplates()).includes("repair.completed"), false);
});
