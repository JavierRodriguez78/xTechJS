import assert from "node:assert/strict";
import test from "node:test";
import type { User, UserCredentials } from "../domain/user.js";
import type { UserRepository } from "./user-repository.js";
import type { UserUpdate } from "./user-repository.js";
import { AuthenticationService, OwnProfileError } from "./authentication-service.js";
import { isStaffRole } from "../../shared/domain/user-role.js";

class TestUserRepository implements UserRepository {
  private readonly users: UserCredentials[] = [];

  async findAll(): Promise<readonly User[]> {
    return this.users;
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async findActiveByRole(): Promise<readonly User[]> {
    return [];
  }

  async findByEmail(email: string): Promise<UserCredentials | undefined> {
    return this.users.find((user) => user.email === email);
  }

  async count(): Promise<number> {
    return this.users.length;
  }

  async create(user: UserCredentials): Promise<User> {
    this.users.push(user);
    return user;
  }

  async update(id: string, input: UserUpdate): Promise<User | undefined> {
    const user = this.users.find((item) => item.id === id);
    if (!user) return undefined;
    Object.assign(user, input);
    return user;
  }

  async recordAuditLog(): Promise<void> {}

  async findNationalId(id: string): Promise<string | null | undefined> { return this.users.find((user) => user.id === id)?.nationalId; }

  async listAuditLogs(): Promise<readonly { id: string; action: string; createdAt: string; actorName: string | null; actorEmail: string | null; targetName: string | null; targetEmail: string | null }[]> {
    return [];
  }
}

test("bootstrap creates exactly one administrator with a password hash", async () => {
  const service = new AuthenticationService(new TestUserRepository());
  const user = await service.bootstrapAdmin({ email: "ADMIN@xtechjs.local", displayName: "Admin", password: "a-secure-password" });

  assert.equal(user.email, "admin@xtechjs.local");
  assert.equal(user.role, "admin");
  assert.notEqual((user as UserCredentials).passwordHash, "a-secure-password");
});

test("authentication rejects an invalid password", async () => {
  const service = new AuthenticationService(new TestUserRepository());
  await service.bootstrapAdmin({ email: "admin@xtechjs.local", displayName: "Admin", password: "a-secure-password" });

  assert.equal(await service.authenticate("admin@xtechjs.local", "incorrect-password"), undefined);
});

test("only administrators and technicians belong to the internal portal", () => {
  assert.equal(isStaffRole("admin"), true);
  assert.equal(isStaffRole("technician"), true);
  assert.equal(isStaffRole("customer"), false);
});

test("own profile never exposes the password hash", async () => {
  const service = new AuthenticationService(new TestUserRepository());
  const user = await service.bootstrapAdmin({ email: "admin@example.test", displayName: "Admin", password: "current-password" });
  const profile = await service.findOwnStaffProfile(user.id);
  assert.equal(profile?.email, "admin@example.test");
  assert.equal(Object.hasOwn(profile!, "passwordHash"), false);
});

test("changing own email requires the current password and normalizes the address", async () => {
  const service = new AuthenticationService(new TestUserRepository());
  const user = await service.bootstrapAdmin({ email: "admin@example.test", displayName: "Admin", password: "current-password" });
  await assert.rejects(service.updateOwnCredentials(user.id, { currentPassword: "wrong-password", email: "new@example.test" }), (error: unknown) => error instanceof OwnProfileError && error.reason === "currentPassword");
  const updated = await service.updateOwnCredentials(user.id, { currentPassword: "current-password", email: " NEW@EXAMPLE.TEST " });
  assert.equal(updated.email, "new@example.test");
  assert.equal(Object.hasOwn(updated, "passwordHash"), false);
  assert.equal(await service.authenticate("admin@example.test", "current-password"), undefined);
  assert.equal((await service.authenticate("new@example.test", "current-password"))?.id, user.id);
});

test("changing own password invalidates the previous login password", async () => {
  const service = new AuthenticationService(new TestUserRepository());
  const user = await service.bootstrapAdmin({ email: "admin@example.test", displayName: "Admin", password: "current-password" });
  const updated = await service.updateOwnCredentials(user.id, { currentPassword: "current-password", newPassword: "new-secure-password" });
  assert.equal(Object.hasOwn(updated, "passwordHash"), false);
  assert.equal(await service.authenticate(user.email, "current-password"), undefined);
  assert.equal((await service.authenticate(user.email, "new-secure-password"))?.id, user.id);
});

test("duplicate emails cannot overwrite another account", async () => {
  const repository = new TestUserRepository();
  const service = new AuthenticationService(repository);
  const user = await service.bootstrapAdmin({ email: "admin@example.test", displayName: "Admin", password: "current-password" });
  await repository.create({ id: "other", email: "other@example.test", displayName: "Other", role: "technician", active: true, storeId: "store-2", passwordHash: "unchanged" });
  await assert.rejects(service.updateOwnCredentials(user.id, { currentPassword: "current-password", email: "other@example.test" }), (error: unknown) => error instanceof OwnProfileError && error.reason === "email");
  assert.equal((await repository.findById(user.id))?.email, "admin@example.test");
  assert.equal((await repository.findByEmail("other@example.test"))?.passwordHash, "unchanged");
});

test("inactive accounts and customers cannot use the internal profile", async () => {
  const repository = new TestUserRepository();
  const service = new AuthenticationService(repository);
  await repository.create({ id: "customer", email: "customer@example.test", displayName: "Customer", role: "customer", active: true, storeId: null, passwordHash: "unused" });
  await repository.create({ id: "inactive", email: "inactive@example.test", displayName: "Inactive", role: "technician", active: false, storeId: "store-1", passwordHash: "unused" });
  for (const id of ["customer", "inactive", "missing"]) {
    assert.equal(await service.findOwnStaffProfile(id), undefined);
    await assert.rejects(service.updateOwnCredentials(id, { currentPassword: "whatever", email: "new@example.test" }), (error: unknown) => error instanceof OwnProfileError && error.reason === "unavailable");
  }
});

test("new passwords respect minimum length and bcrypt's UTF-8 byte limit", async () => {
  const service = new AuthenticationService(new TestUserRepository());
  const user = await service.bootstrapAdmin({ email: "admin@example.test", displayName: "Admin", password: "current-password" });
  for (const newPassword of ["short", "a".repeat(73), "\u00e9".repeat(37)]) {
    await assert.rejects(service.updateOwnCredentials(user.id, { currentPassword: "current-password", newPassword }), (error: unknown) => error instanceof OwnProfileError && error.reason === "newPassword");
  }
  assert.ok(await service.authenticate(user.email, "current-password"));
});