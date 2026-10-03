import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyRequest } from "fastify";
import type { DataSource } from "typeorm";
import type { CommandBus, QueryBus } from "@xtaskjs/cqrs";
import { AuthController } from "./auth-routes.js";
import { OwnProfileError } from "../../application/authentication-service.js";
import { FindOwnStaffProfileQuery, UpdateOwnStaffCredentialsCommand } from "../../application/cqrs/user-messages.js";

const user = { id: "staff-id", email: "new@example.test", displayName: "Eva", role: "technician" as const, storeId: "store-id", active: true, passwordHash: "never-public" };
function setup(commandResult: () => unknown = () => user, queryResult: () => unknown = () => user) {
  const commands: unknown[] = [];
  const queries: unknown[] = [];
  const signed: unknown[] = [];
  const controller = new AuthController({} as DataSource, { execute: async (command: unknown) => { commands.push(command); return commandResult(); } } as unknown as CommandBus, { execute: async (query: unknown) => { queries.push(query); return queryResult(); } } as unknown as QueryBus);
  const request = { user: { sub: "staff-id", role: "technician", storeId: "store-id" }, server: { jwt: { sign: (payload: unknown) => { signed.push(payload); return "test-token"; } } } } as unknown as FastifyRequest;
  const reply = { status: 200, code(status: number) { this.status = status; return this; }, send(payload: unknown) { return payload; } };
  return { controller, request, reply, commands, queries, signed };
}

test("profile reads only the authenticated account and hides hashes", async () => {
  const { controller, request, reply, queries } = setup();
  const result = await controller.ownProfile(request, reply) as typeof user;
  assert.deepEqual(queries, [new FindOwnStaffProfileQuery("staff-id")]);
  assert.equal(Object.hasOwn(result, "passwordHash"), false);
});

test("profile updates use the token identity and refresh the email claim", async () => {
  const { controller, request, reply, commands, signed } = setup();
  const result = await controller.updateOwnProfile({ email: "new@example.test", currentPassword: "current-password" }, request, reply) as { accessToken: string; user: object };
  assert.deepEqual(commands, [new UpdateOwnStaffCredentialsCommand("staff-id", { email: "new@example.test", currentPassword: "current-password" })]);
  assert.deepEqual(signed, [{ sub: "staff-id", email: "new@example.test", role: "technician", defaultStoreId: "store-id", storeAccess: ["store-id"], storeId: "store-id" }]);
  assert.equal(result.accessToken, "test-token");
  assert.equal(Object.hasOwn(result.user, "passwordHash"), false);
});

test("profile rejects account IDs, privilege changes and invalid or empty credential changes", async () => {
  for (const body of [
    { currentPassword: "current-password" },
    { email: "new@example.test" },
    { currentPassword: "current-password", email: "invalid" },
    { currentPassword: "current-password", newPassword: "short" },
    { currentPassword: "current-password", newPassword: "\u00e9".repeat(37) },
    { currentPassword: "current-password", email: "new@example.test", id: "another-user" },
    { currentPassword: "current-password", email: "new@example.test", role: "admin" },
    { currentPassword: "current-password", email: "new@example.test", storeId: "other-store" }
  ]) {
    const { controller, request, reply, commands } = setup();
    await controller.updateOwnProfile(body, request, reply);
    assert.equal(reply.status, 400);
    assert.equal(commands.length, 0);
  }
});

test("customers and impersonation sessions cannot change internal credentials", async () => {
  for (const claims of [{ sub: "staff-id", role: "customer" }, { sub: "staff-id", role: "technician", impersonatorId: "admin-id" }]) {
    const { controller, request, reply, commands } = setup();
    Object.assign(request.user, claims);
    await controller.updateOwnProfile({ currentPassword: "current-password", email: "new@example.test" }, request, reply);
    assert.equal(reply.status, 403);
    assert.equal(commands.length, 0);
  }
});

test("credential errors are returned on their respective fields", async () => {
  for (const field of ["currentPassword", "email", "newPassword"] as const) {
    const { controller, request, reply } = setup(() => { throw new OwnProfileError(field); });
    const result = await controller.updateOwnProfile({ currentPassword: "current-password", email: "new@example.test" }, request, reply) as { issues: { fieldErrors: Record<string, string[]> } };
    assert.equal(reply.status, field === "email" ? 409 : 400);
    assert.ok(result.issues.fieldErrors[field]?.length);
  }
});

test("a concurrent duplicate email is still reported as a conflict", async () => {
  const { controller, request, reply } = setup(() => { throw { driverError: { code: "23505" } }; });
  await controller.updateOwnProfile({ currentPassword: "current-password", email: "new@example.test" }, request, reply);
  assert.equal(reply.status, 409);
});

test("unavailable profiles require authentication again", async () => {
  const { controller, request, reply } = setup(() => { throw new OwnProfileError("unavailable"); }, () => undefined);
  await controller.ownProfile(request, reply);
  assert.equal(reply.status, 401);
  await controller.updateOwnProfile({ currentPassword: "current-password", email: "new@example.test" }, request, reply);
  assert.equal(reply.status, 401);
});