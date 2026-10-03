import assert from "node:assert/strict";
import { compare } from "bcryptjs";
import test from "node:test";
import type { User, UserCredentials } from "../domain/user.js";
import type { UserRepository, UserUpdate } from "./user-repository.js";
import { ManageUser } from "./manage-user.js";

const storeA = "00000000-0000-4000-8000-000000000001";
const storeB = "00000000-0000-4000-8000-000000000002";
class TestUserRepository implements UserRepository {
  users: UserCredentials[] = [];
  audit: Array<{ actorId: string; targetId: string; action: string }> = [];
  async findAll(): Promise<readonly User[]> { return this.users; }
  async findById(id: string): Promise<User | undefined> { return this.users.find((user) => user.id === id); }
  async findActiveByRole(role: User["role"]): Promise<readonly User[]> { return this.users.filter((user) => user.active && user.role === role); }
  async findByEmail(email: string): Promise<UserCredentials | undefined> { return this.users.find((user) => user.email === email); }
  async count(): Promise<number> { return this.users.length; }
  async create(user: UserCredentials): Promise<User> { this.users.push(user); return user; }
  async update(id: string, input: UserUpdate): Promise<User | undefined> { const user = this.users.find((item) => item.id === id); if (!user) return undefined; Object.assign(user, input); return user; }
  async recordAuditLog(actorId: string, targetId: string, action: string): Promise<void> { this.audit.push({ actorId, targetId, action }); }
  async findNationalId(id: string): Promise<string | null | undefined> { return this.users.find((user) => user.id === id)?.nationalId; }
  async listAuditLogs() { return []; }
}

const input = { email: "EVA@EXAMPLE.TEST", displayName: " Eva Tecnica ", role: "technician" as const, password: "secure-password-123", defaultStoreId: storeA, storeAccess: [storeA, storeB], phone: " 600000000 ", nationalId: " 12345678Z ", addressStreet: " Calle Uno ", addressPostalCode: "28001", addressCity: "Madrid", addressProvince: "Madrid", addressCountry: "España" };

 test("employee creation normalizes identity, hashes password and persists multiple stores", async () => {
  const repository = new TestUserRepository();
  const manager = new ManageUser(repository);
  const created = await manager.create(input, "admin-1");
  assert.equal(created.email, "eva@example.test");
  assert.equal(created.displayName, "Eva Tecnica");
  assert.equal(created.defaultStoreId, storeA);
  assert.deepEqual(created.storeAccess, [storeA, storeB]);
  assert.equal(created.phone, "600000000");
  assert.equal(created.nationalId, "12345678Z");
  assert.equal(created.addressStreet, "Calle Uno");
  assert.ok(created.hiredAt instanceof Date);
  assert.equal(await compare(input.password, repository.users[0].passwordHash), true);
  assert.deepEqual(repository.audit, [{ actorId: "admin-1", targetId: created.id, action: "employee.created" }]);
});

test("technicians must have at least one store and a default within their scope", async () => {
  const manager = new ManageUser(new TestUserRepository());
  await assert.rejects(manager.create({ ...input, storeAccess: [] }));
  await assert.rejects(manager.create({ ...input, defaultStoreId: storeB, storeAccess: [storeA] }));
  await assert.rejects(manager.create({ ...input, storeAccess: [storeA, storeA] }));
});

test("admins can have global access with or without a default store", async () => {
  const manager = new ManageUser(new TestUserRepository());
  const global = await manager.create({ ...input, role: "admin", defaultStoreId: null, storeAccess: null });
  const globalWithDefault = await manager.create({ ...input, email: "second@example.test", role: "admin", defaultStoreId: storeA, storeAccess: null });
  const scoped = await manager.create({ ...input, email: "third@example.test", role: "admin", defaultStoreId: storeA, storeAccess: [storeA, storeB] });
  assert.equal(global.storeAccess, null);
  assert.equal(globalWithDefault.defaultStoreId, storeA);
  assert.equal(globalWithDefault.storeAccess, null);
  assert.deepEqual(scoped.storeAccess, [storeA, storeB]);
});

test("a schedule-free edit preserves store access and does not write access audit", async () => {
  const repository = new TestUserRepository();
  const manager = new ManageUser(repository);
  const created = await manager.create(input, "admin-1");
  repository.audit.length = 0;
  const updated = await manager.update(created.id, { phone: "611111111" }, "admin-1");
  assert.equal(updated?.phone, "611111111");
  assert.deepEqual(updated?.storeAccess, [storeA, storeB]);
  assert.deepEqual(repository.audit, []);
});

test("role, scope changes and deactivation are separately audited", async () => {
  const repository = new TestUserRepository();
  const manager = new ManageUser(repository);
  const created = await manager.create(input, "admin-1");
  repository.audit.length = 0;
  const deactivated = await manager.update(created.id, { role: "admin", defaultStoreId: storeB, storeAccess: [storeB], active: false }, "admin-1");
  assert.equal(deactivated?.active, false);
  assert.ok(deactivated?.deactivatedAt instanceof Date);
  assert.deepEqual(repository.audit.map((event) => event.action).sort(), ["employee.deactivated", "employee.role.changed", "employee.stores.changed"]);
  const reactivated = await manager.update(created.id, { active: true }, "admin-1");
  assert.equal(reactivated?.deactivatedAt, null);
  assert.equal(repository.audit.at(-1)?.action, "employee.reactivated");
});

test("duplicate emails are rejected and an invalid password hash is not generated", async () => {
  const repository = new TestUserRepository();
  const manager = new ManageUser(repository);
  const created = await manager.create(input);
  await assert.rejects(manager.create({ ...input, email: "eva@example.test" }), /already exists/);
  await assert.rejects(manager.create({ ...input, password: "x".repeat(73) }), /72 bytes/);
  assert.equal(repository.users.length, 1);
  assert.equal(await compare(input.password, repository.users[0].passwordHash), true);
  assert.equal(typeof created.id, "string");
});
