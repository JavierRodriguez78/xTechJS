import assert from "node:assert/strict";
import test from "node:test";
import type { User, UserCredentials } from "../../users/domain/user.js";
import type { UserRepository, UserUpdate } from "../../users/application/user-repository.js";
import type { RepairOrderRepository, NewRepairOrderRecord } from "./repair-order-repository.js";
import type { RepairOrder, RepairStatusEvent } from "../domain/repair-order.js";
import type { RepairStatus } from "../domain/repair-status.js";
import type { RepairWorkflowConfig } from "./repair-workflow-config.js";
import { CreateRepairOrder } from "./create-repair-order.js";
import { DevicePasscodeCipher } from "./device-passcode-cipher.js";
import { SaveRepairQuote } from "./save-repair-quote.js";
import { UpdateRepairTechnical } from "./update-repair-technical.js";
import { canTransitionRepairStatus } from "../domain/repair-status.js";

function workflowConfig(overrides: Partial<{ statuses: readonly string[]; deviceTypes: readonly string[] }> = {}): RepairWorkflowConfig {
  return {
    async listStatuses() { return overrides.statuses ?? []; },
    async listDeviceTypes() { return overrides.deviceTypes ?? ["Consola", "Móvil"]; },
    async listDeviceCatalog() { return []; }
  };
}

class TestRepairRepository implements RepairOrderRepository {
  async create(input: NewRepairOrderRecord): Promise<RepairOrder> { return { ...input, serialNumber: input.serialNumber ?? null, deliveredAccessories: input.deliveredAccessories ?? null, technicianId: null, estimatedCompletionAt: input.estimatedCompletionAt ?? null, diagnosis: null, status: "received", createdAt: new Date(), updatedAt: new Date() }; }
  async findAll(): Promise<readonly RepairOrder[]> { return []; }
  async findPage() { return { items: [], total: 0, page: 1, pageSize: 25 }; }
  async findById(): Promise<RepairOrder | undefined> { return undefined; }
  async findByCustomerId(): Promise<readonly RepairOrder[]> { return []; }
  async changeStatus(_: string, __: RepairStatus): Promise<RepairOrder | undefined> { return undefined; }
  async findStatusHistory(): Promise<readonly RepairStatusEvent[]> { return []; }
  async updateTechnical(id: string, input: { technicianId?: string; diagnosis?: string }): Promise<RepairOrder | undefined> { return { id, customerId: "customer-1", deviceType: "Consola", brand: "Sony", model: "PS5", serialNumber: null, reportedIssue: "No enciende", deliveredAccessories: null, technicianId: input.technicianId ?? null, estimatedCompletionAt: null, diagnosis: input.diagnosis ?? null, status: "received", createdAt: new Date(), updatedAt: new Date() }; }
}

class TestUserRepository implements UserRepository {
  async findAll(): Promise<readonly User[]> { return []; }
  async findById(id: string): Promise<User | undefined> { return id === "technician-1" ? { id, email: "tech@example.com", displayName: "Ana", role: "technician", storeId: null, active: true } : undefined; }
  async findActiveByRole(): Promise<readonly User[]> { return []; }
  async findByEmail(): Promise<UserCredentials | undefined> { return undefined; }
  async count(): Promise<number> { return 0; }
  async create(user: UserCredentials): Promise<User> { return user; }
  async update(id: string, input: UserUpdate): Promise<User | undefined> { return this.findById(id).then((user) => user ? { ...user, ...input } : undefined); }
  async recordAuditLog(): Promise<void> {}
  async findNationalId(): Promise<string | null | undefined> { return undefined; }
  async listAuditLogs(): Promise<readonly { id: string; action: string; createdAt: string; actorName: string | null; actorEmail: string | null; targetName: string | null; targetEmail: string | null }[]> { return []; }
}

function createRepairOrderService(config = workflowConfig(), quoteSaver: Pick<SaveRepairQuote, "execute"> = { async execute() { return undefined; } }): CreateRepairOrder {
  return new CreateRepairOrder(new TestRepairRepository(), config, new TestUserRepository(), new DevicePasscodeCipher(), quoteSaver as SaveRepairQuote);
}

test("repair orders start received and normalize supplied device details", async () => {
  const repair = await createRepairOrderService().execute({ customerId: "customer-1", storeId: "store-1", deviceType: " Consola ", brand: " Sony ", model: " PS5 ", reportedIssue: " No enciende " }, "staff-1");
  assert.equal(repair.status, "received");
  assert.equal(repair.brand, "Sony");
  assert.equal(repair.reportedIssue, "No enciende");
});

test("a repair order rejects a device type that the administrator has not configured", async () => {
  const service = createRepairOrderService(workflowConfig({ deviceTypes: ["Consola"] }));
  await assert.rejects(
    () => service.execute({ customerId: "customer-1", storeId: "store-1", deviceType: "Dron", brand: "DJI", model: "Mini", reportedIssue: "No despega" }, "staff-1"),
    /Device type Dron is not configured/
  );
});

test("a repair order accepts a device type added by the administrator", async () => {
  const service = createRepairOrderService(workflowConfig({ deviceTypes: ["Consola", "Dron"] }));
  const repair = await service.execute({ customerId: "customer-1", storeId: "store-1", deviceType: "Dron", brand: "DJI", model: "Mini", reportedIssue: "No despega" }, "staff-1");
  assert.equal(repair.deviceType, "Dron");
});

test("an empty device type configuration does not block receiving equipment", async () => {
  const service = createRepairOrderService(workflowConfig({ deviceTypes: [] }));
  const repair = await service.execute({ customerId: "customer-1", storeId: "store-1", deviceType: "Cualquiera", brand: "Generica", model: "X", reportedIssue: "Revision" }, "staff-1");
  assert.equal(repair.deviceType, "Cualquiera");
});

test("a repair can be received with an active technician and estimated completion", async () => {
  const estimatedCompletionAt = new Date("2026-10-05T10:00:00.000Z");
  const repair = await createRepairOrderService().execute({ customerId: "customer-1", storeId: "store-1", deviceType: "Consola", brand: "Sony", model: "PS5", reportedIssue: "No enciende", technicianId: "technician-1", estimatedCompletionAt }, "staff-1");
  assert.equal(repair.estimatedCompletionAt, estimatedCompletionAt);
});

test("a repair can include an initial draft quote", async () => {
  let saved: { repairOrderId: string; status: string; lines: unknown[] } | undefined;
  const service = createRepairOrderService(workflowConfig(), { async execute(repairOrderId, input) { saved = { repairOrderId, status: input.status, lines: input.lines }; return undefined; } });
  await service.execute({ customerId: "customer-1", storeId: "store-1", deviceType: "Consola", brand: "Sony", model: "PS5", reportedIssue: "No enciende", initialQuoteLines: [{ description: "Diagnostico", quantity: 1, unitPriceCents: 2500 }] }, "staff-1");
  assert.equal(typeof saved?.repairOrderId, "string");
  assert.equal(saved?.status, "draft");
  assert.deepEqual(saved?.lines, [{ description: "Diagnostico", quantity: 1, unitPriceCents: 2500 }]);
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