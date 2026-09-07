import assert from "node:assert/strict";
import test from "node:test";
import type { User, UserCredentials } from "../domain/user.js";
import type { UserRepository } from "./user-repository.js";
import { AuthenticationService } from "./authentication-service.js";
import { isStaffRole } from "../../shared/domain/user-role.js";

class TestUserRepository implements UserRepository {
  private readonly users: UserCredentials[] = [];

  async findAll(): Promise<readonly User[]> {
    return this.users;
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
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