import assert from "node:assert/strict";
import test from "node:test";
import type { User, UserCredentials } from "../../users/domain/user.js";
import type { UserRepository } from "../../users/application/user-repository.js";
import type { RepairOrderRepository, NewRepairOrderRecord } from "./repair-order-repository.js";
import type { RepairOrder, RepairStatusEvent } from "../domain/repair-order.js";
import type { RepairStatus } from "../domain/repair-status.js";
import { CreateRepairOrder } from "./create-repair-order.js";
import { UpdateRepairTechnical } from "./update-repair-technical.js";
import { canTransitionRepairStatus } from "../domain/repair-status.js";

class TestRepairRepository implements RepairOrderRepository {
  async create(input: NewRepairOrderRecord): Promise<RepairOrder> { return { ...input, serialNumber: input.serialNumber ?? null, deliveredAccessories: input.deliveredAccessories ?? null, technicianId: null, diagnosis: null, status: "received", createdAt: new Date(), updatedAt: new Date() }; }
  async findAll(): Promise<readonly RepairOrder[]> { return []; }
  async findById(): Promise<RepairOrder | undefined> { return undefined; }
  async changeStatus(_: string, __: RepairStatus): Promise<RepairOrder | undefined> { return undefined; }
  async findStatusHistory(): Promise<readonly RepairStatusEvent[]> { return []; }
  async updateTechnical(id: string, input: { technicianId?: string; diagnosis?: string }): Promise<RepairOrder | undefined> { return { id, customerId: "customer-1", deviceType: "Consola", brand: "Sony", model: "PS5", serialNumber: null, reportedIssue: "No enciende", deliveredAccessories: null, technicianId: input.technicianId ?? null, diagnosis: input.diagnosis ?? null, status: "received", createdAt: new Date(), updatedAt: new Date() }; }
}

class TestUserRepository implements UserRepository {
  async findAll(): Promise<readonly User[]> { return []; }
  async findById(id: string): Promise<User | undefined> { return id === "technician-1" ? { id, email: "tech@example.com", displayName: "Ana", role: "technician", active: true } : undefined; }
  async findActiveByRole(): Promise<readonly User[]> { return []; }
  async findByEmail(): Promise<UserCredentials | undefined> { return undefined; }
  async count(): Promise<number> { return 0; }
  async create(user: UserCredentials): Promise<User> { return user; }
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

test("a repair can only be assigned to an active technician", async () => {
  const service = new UpdateRepairTechnical(new TestRepairRepository(), new TestUserRepository());
  const repair = await service.execute("repair-1", { technicianId: "technician-1", diagnosis: "Fallo de alimentacion" });
  assert.equal(repair?.technicianId, "technician-1");
  await assert.rejects(() => service.execute("repair-1", { technicianId: "customer-1" }), /active technician/);
});