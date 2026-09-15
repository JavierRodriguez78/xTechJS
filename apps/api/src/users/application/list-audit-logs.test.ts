import assert from "node:assert/strict";
import test from "node:test";
import type { User, UserCredentials } from "../domain/user.js";
import type { UserRepository } from "./user-repository.js";
import { ListAuditLogs } from "./list-audit-logs.js";

class TestUserRepository implements UserRepository {
  async findAll(): Promise<readonly User[]> { return []; }
  async findById(): Promise<User | undefined> { return undefined; }
  async findActiveByRole(): Promise<readonly User[]> { return []; }
  async findByEmail(): Promise<UserCredentials | undefined> { return undefined; }
  async count(): Promise<number> { return 0; }
  async create(): Promise<User> { throw new Error("not implemented"); }
  async update(): Promise<User | undefined> { return undefined; }
  async listAuditLogs() {
    return [
      { id: "a-1", action: "user.impersonated", createdAt: "2026-09-15T00:00:00Z", actorName: "Admin", actorEmail: "admin@xtechjs.local", targetName: "Tecnico", targetEmail: "tech@xtechjs.local" }
    ];
  }
}

test("list audit logs returns the latest admin activity", async () => {
  const service = new ListAuditLogs(new TestUserRepository());

  const logs = await service.execute();

  assert.equal(logs.length, 1);
  assert.equal(logs[0].action, "user.impersonated");
  assert.equal(logs[0].actorEmail, "admin@xtechjs.local");
});
