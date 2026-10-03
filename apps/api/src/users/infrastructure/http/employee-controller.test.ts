import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyRequest } from "fastify";
import type { DataSource } from "typeorm";
import type { CommandBus, QueryBus } from "@xtaskjs/cqrs";
import { UserController } from "./user-controller.js";
import { CreateEmployeeCommand, ListUsersQuery, UpdateEmployeeCommand } from "../../application/cqrs/user-messages.js";

const storeA = "00000000-0000-4000-8000-000000000001";
const storeB = "00000000-0000-4000-8000-000000000002";
const employee = { id: "00000000-0000-4000-8000-000000000101", email: "ana@example.test", displayName: "Ana", role: "technician" as const, defaultStoreId: storeA, storeAccess: [storeA, storeB], active: true };
function setup(users: unknown[] = [employee], existingStoreIds = [storeA, storeB], nationalId: string | null = "12345678Z") {
  const commands: unknown[] = [];
  const queries: unknown[] = [];
  const controller = new UserController({ execute: async (query: unknown) => { queries.push(query); return query instanceof ListUsersQuery ? users : undefined; } } as unknown as QueryBus, { execute: async (command: unknown) => { commands.push(command); return command; } } as unknown as CommandBus, {} as never);
  const datasource = {
    query: async (_sql: string, [ids]: [string[]]) => existingStoreIds.filter((id) => ids.includes(id)).map((id) => ({ id })),
    getRepository: () => ({ createQueryBuilder: () => ({ addSelect() { return this; }, where() { return this; }, getOne: async () => ({ nationalId }) }) })
  };
  Object.defineProperty(controller, "dataSource", { value: datasource as unknown as DataSource });
  const reply = { status: 200, code(status: number) { this.status = status; return this; }, send(payload: unknown) { return payload; } };
  const request = (role = "admin", claims: Record<string, unknown> = {}) => ({ user: { sub: "actor-1", role, ...claims } }) as unknown as FastifyRequest;
  return { controller, commands, queries, reply, request };
}

const baseInput = { email: "ana@example.test", displayName: "Ana", role: "technician" as const, password: "secure-password-123", defaultStoreId: storeA, storeAccess: [storeA, storeB], phone: null, nationalId: "12345678Z" };

test("employee creation validates store IDs and takes the actor from the token", async () => {
  const { controller, commands, reply, request } = setup([]);
  await controller.createEmployee(baseInput, request(), reply);
  assert.equal(reply.status, 201);
  assert.deepEqual(commands[0], new CreateEmployeeCommand(baseInput, "actor-1"));
});

test("employee creation rejects missing default inclusion and inactive or unknown stores", async () => {
  for (const [input, stores] of [
    [{ ...baseInput, defaultStoreId: "00000000-0000-4000-8000-000000000003" }, [storeA, storeB]],
    [{ ...baseInput, storeAccess: [] }, [storeA]],
    [{ ...baseInput, storeAccess: [storeA, "00000000-0000-4000-8000-000000000003"] }, [storeA]]
  ] as const) {
    const { controller, commands, reply, request } = setup([], [...stores]);
    await controller.createEmployee(input, request(), reply);
    assert.equal(reply.status, 400);
    assert.equal(commands.length, 0);
  }
});

test("global admin can be created with null store access", async () => {
  const input = { ...baseInput, role: "admin" as const, defaultStoreId: null, storeAccess: null };
  const { controller, commands, reply, request } = setup([]);
  await controller.createEmployee(input, request(), reply);
  assert.equal(reply.status, 201);
  assert.deepEqual(commands[0], new CreateEmployeeCommand(input, "actor-1"));
});

test("employee patch preserves current store assignments when fields are omitted", async () => {
  const { controller, commands, reply, request } = setup([employee]);
  await controller.updateEmployee(employee.id, { phone: "600000000" }, request(), reply);
  assert.equal(reply.status, 200);
  assert.deepEqual(commands[0], new UpdateEmployeeCommand(employee.id, { phone: "600000000" }, "actor-1"));
});

test("employees list exposes staff only and reveals DNI only on explicit admin request", async () => {
  const { controller, queries, reply, request } = setup([employee, { id: "customer-1", role: "customer" }]);
  const result = await controller.listEmployees(request()) as Array<{ id: string }>;
  assert.deepEqual(result, [employee]);
  assert.ok(queries.some((query) => query instanceof ListUsersQuery));
  assert.deepEqual(await controller.revealEmployeeNationalId(employee.id, request(), reply), { nationalId: "12345678Z" });
  await controller.revealEmployeeNationalId(employee.id, request("technician"), reply);
  assert.equal(reply.status, 403);
});

test("a store administrator sees only overlapping employees and cannot reveal another store's DNI", async () => {
  const otherEmployee = { ...employee, id: "00000000-0000-4000-8000-000000000102", defaultStoreId: storeB, storeAccess: [storeB] };
  const { controller, reply, request } = setup([employee, otherEmployee]);
  const scopedAdmin = request("admin", { defaultStoreId: storeA, storeId: storeA, storeAccess: [storeA] });
  assert.deepEqual(await controller.listEmployees(scopedAdmin), [employee]);
  await controller.revealEmployeeNationalId(otherEmployee.id, scopedAdmin, reply);
  assert.equal(reply.status, 404);
});

test("a store administrator cannot create an employee with access outside their scope", async () => {
  const { controller, commands, reply, request } = setup([]);
  await controller.createEmployee(baseInput, request("admin", { defaultStoreId: storeA, storeId: storeA, storeAccess: [storeA] }), reply);
  assert.equal(reply.status, 403);
  assert.equal(commands.length, 0);
});

test("employee deactivation is explicit and does not allow an administrator to remove their own access", async () => {
  const { controller, commands, reply, request } = setup([employee]);
  await controller.updateEmployee(employee.id, { active: false }, request(), reply);
  assert.equal(reply.status, 200);
  assert.deepEqual(commands[0], new UpdateEmployeeCommand(employee.id, { active: false }, "actor-1"));
  const ownAdmin = { ...employee, role: "admin" };
  const second = setup([ownAdmin]);
  const ownRequest = second.request();
  (ownRequest.user as { sub: string }).sub = employee.id;
  await second.controller.updateEmployee(employee.id, { active: false }, ownRequest, second.reply);
  assert.equal(second.reply.status, 409);
  assert.equal(second.commands.length, 0);
});