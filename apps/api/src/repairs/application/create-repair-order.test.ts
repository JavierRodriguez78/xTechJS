import assert from "node:assert/strict";
import test from "node:test";
import type { RepairOrderRepository, NewRepairOrderRecord } from "./repair-order-repository.js";
import type { RepairOrder, RepairStatusEvent } from "../domain/repair-order.js";
import type { RepairStatus } from "../domain/repair-status.js";
import { CreateRepairOrder } from "./create-repair-order.js";
import { canTransitionRepairStatus } from "../domain/repair-status.js";

class TestRepairRepository implements RepairOrderRepository {
  async create(input: NewRepairOrderRecord): Promise<RepairOrder> { return { ...input, serialNumber: input.serialNumber ?? null, deliveredAccessories: input.deliveredAccessories ?? null, status: "received", createdAt: new Date(), updatedAt: new Date() }; }
  async findAll(): Promise<readonly RepairOrder[]> { return []; }
  async findById(): Promise<RepairOrder | undefined> { return undefined; }
  async changeStatus(_: string, __: RepairStatus): Promise<RepairOrder | undefined> { return undefined; }
  async findStatusHistory(): Promise<readonly RepairStatusEvent[]> { return []; }
}

test("repair orders start received and normalize supplied device details", async () => {
  const repair = await new CreateRepairOrder(new TestRepairRepository()).execute({ customerId: "customer-1", deviceType: " Consola ", brand: " Sony ", model: " PS5 ", reportedIssue: " No enciende " });
  assert.equal(repair.status, "received");
  assert.equal(repair.brand, "Sony");
  assert.equal(repair.reportedIssue, "No enciende");
});

test("repair status changes follow the workshop workflow", () => {
  assert.equal(canTransitionRepairStatus("received", "diagnosing"), true);
  assert.equal(canTransitionRepairStatus("received", "repaired"), false);
  assert.equal(canTransitionRepairStatus("delivered", "repairing"), false);
});