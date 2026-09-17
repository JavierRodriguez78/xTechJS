import assert from "node:assert/strict";
import test from "node:test";
import { AdminConfigService, ProtectedConfigValueError } from "./admin-config.js";

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

test("adding an existing repair status does not duplicate it", async () => {
  const service = new AdminConfigService();

  await service.addRepairStatus("awaiting-parts");
  await service.addRepairStatus("  awaiting-parts  ");

  assert.equal((await service.listRepairStatuses()).filter((status) => status === "awaiting-parts").length, 1);
});

test("a blank repair status is ignored", async () => {
  const service = new AdminConfigService();
  const before = await service.listRepairStatuses();

  await service.addRepairStatus("   ");

  assert.deepEqual(await service.listRepairStatuses(), before);
});

test("statuses written by the quote flow cannot be removed", async () => {
  const service = new AdminConfigService();

  await assert.rejects(() => service.removeRepairStatus("approved"), ProtectedConfigValueError);
  await assert.rejects(() => service.removeRepairStatus("quoted"), ProtectedConfigValueError);
  assert.equal((await service.listRepairStatuses()).includes("approved"), true);
});

test("a status not used by automated flows can be removed", async () => {
  const service = new AdminConfigService();

  await service.removeRepairStatus("testing");

  assert.equal((await service.listRepairStatuses()).includes("testing"), false);
});

test("device types can be added and removed", async () => {
  const service = new AdminConfigService();

  await service.addDeviceType("Tablet");
  assert.equal((await service.listDeviceTypes()).includes("Tablet"), true);

  await service.removeDeviceType("Tablet");
  assert.equal((await service.listDeviceTypes()).includes("Tablet"), false);
});
