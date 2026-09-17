import assert from "node:assert/strict";
import test from "node:test";
import { REPAIR_STATUSES, canTransitionRepairStatus } from "../domain/repair-status.js";
import type { RepairOrder } from "../domain/repair-order.js";
import { ChangeRepairStatus } from "./change-repair-status.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import type { RepairStatusNotifier } from "./repair-status-notifier.js";
import type { RepairWorkflowConfig } from "./repair-workflow-config.js";

function repairOrder(status: string): RepairOrder {
  return {
    id: "repair-1",
    customerId: "customer-1",
    deviceType: "Consola",
    brand: "Sony",
    model: "PS5",
    serialNumber: null,
    reportedIssue: "No enciende",
    deliveredAccessories: null,
    technicianId: null,
    diagnosis: null,
    status,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function scenario(currentStatus: string, configured: readonly string[]) {
  const changes: { status: string; note?: string }[] = [];
  const notified: { status: string; note?: string }[] = [];
  const repository = {
    async findById() { return repairOrder(currentStatus); },
    async changeStatus(_id: string, status: string, note?: string) { changes.push({ status, note }); return repairOrder(status); }
  } as unknown as RepairOrderRepository;
  const config: RepairWorkflowConfig = {
    async listStatuses() { return configured; },
    async listDeviceTypes() { return []; }
  };
  const notifier: RepairStatusNotifier = {
    async notifyStatusChange(repair, note) { notified.push({ status: repair.status, note }); }
  };
  return { service: new ChangeRepairStatus(repository, config, notifier), changes, notified };
}

test("a status outside the administrative configuration is rejected", async () => {
  const { service, changes } = scenario("received", REPAIR_STATUSES);

  await assert.rejects(() => service.execute("repair-1", "awaiting-parts"), /Repair status awaiting-parts is not configured/);
  assert.deepEqual(changes, []);
});

test("a status added by the administrator becomes usable in the workshop flow", async () => {
  const { service, changes } = scenario("diagnosing", [...REPAIR_STATUSES, "awaiting-parts"]);

  const repair = await service.execute("repair-1", "awaiting-parts", "  Falta la placa base  ");

  assert.equal(repair?.status, "awaiting-parts");
  assert.deepEqual(changes, [{ status: "awaiting-parts", note: "Falta la placa base" }]);
});

test("a built-in status removed from the configuration stops being reachable", async () => {
  const { service } = scenario("received", REPAIR_STATUSES.filter((status) => status !== "diagnosing"));

  await assert.rejects(() => service.execute("repair-1", "diagnosing"), /is not configured/);
});

test("a custom status does not reopen an order already closed by a terminal status", async () => {
  const { service } = scenario("delivered", [...REPAIR_STATUSES, "awaiting-parts"]);

  await assert.rejects(() => service.execute("repair-1", "awaiting-parts"), /Cannot change repair status from delivered/);
});

test("the workshop matrix still applies between built-in statuses", async () => {
  const { service } = scenario("received", REPAIR_STATUSES);

  await assert.rejects(() => service.execute("repair-1", "repaired"), /Cannot change repair status from received to repaired/);
});

test("a persisted status change notifies the customer with the applied note", async () => {
  const { service, notified } = scenario("received", REPAIR_STATUSES);

  await service.execute("repair-1", "diagnosing", "En cola de diagnostico");

  assert.deepEqual(notified, [{ status: "diagnosing", note: "En cola de diagnostico" }]);
});

test("a missing repair order neither changes status nor notifies", async () => {
  const notified: string[] = [];
  const repository = { async findById() { return undefined; } } as unknown as RepairOrderRepository;
  const config: RepairWorkflowConfig = { async listStatuses() { return REPAIR_STATUSES; }, async listDeviceTypes() { return []; } };
  const notifier: RepairStatusNotifier = { async notifyStatusChange(repair) { notified.push(repair.status); } };

  const repair = await new ChangeRepairStatus(repository, config, notifier).execute("unknown", "diagnosing");

  assert.equal(repair, undefined);
  assert.deepEqual(notified, []);
});

test("custom statuses chain between themselves without a transition matrix", () => {
  const configured = [...REPAIR_STATUSES, "awaiting-parts", "awaiting-customer"];

  assert.equal(canTransitionRepairStatus("awaiting-parts", "awaiting-customer", configured), true);
  assert.equal(canTransitionRepairStatus("awaiting-parts", "awaiting-parts", configured), false);
  assert.equal(canTransitionRepairStatus("awaiting-parts", "sin-configurar", configured), false);
  assert.equal(canTransitionRepairStatus("cancelled", "awaiting-parts", configured), false);
});
