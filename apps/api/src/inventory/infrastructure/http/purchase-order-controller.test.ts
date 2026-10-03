import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyRequest } from "fastify";
import type { CommandBus, QueryBus } from "@xtaskjs/cqrs";
import type { DataSource } from "typeorm";
import { PurchaseOrderController } from "./purchase-order-controller.js";
import { CreatePurchaseOrderCommand, ListPurchaseOrdersQuery, ReceivePurchaseOrderCommand } from "../../application/cqrs/purchase-order-messages.js";

const storeA = "00000000-0000-4000-8000-000000000001";
const storeB = "00000000-0000-4000-8000-000000000002";
function setup(activeStoreIds = [storeA, storeB]) {
  const commands: unknown[] = [];
  const queries: unknown[] = [];
  const controller = new PurchaseOrderController(
    { execute: async (command: unknown) => { commands.push(command); return command; } } as unknown as CommandBus,
    { execute: async (query: unknown) => { queries.push(query); return query; } } as unknown as QueryBus
  );
  Object.defineProperty(controller, "dataSource", { value: { query: async (_sql: string, [id]: [string]) => activeStoreIds.includes(id) ? [{ id }] : [] } as unknown as DataSource });
  const reply = { status: 200, code(status: number) { this.status = status; return this; }, send(payload: unknown) { return payload; } };
  const request = (claims: object = { role: "technician", storeId: storeA, defaultStoreId: storeA, storeAccess: [storeA, storeB] }, query: object = {}) => ({ user: claims, query }) as unknown as FastifyRequest;
  return { controller, commands, queries, reply, request };
}
const input = { storeId: storeB, supplierId: "00000000-0000-4000-8000-000000000010", lines: [{ inventoryItemId: "00000000-0000-4000-8000-000000000020", quantity: 2, unitCostCents: 500 }] };

test("purchase orders are scoped to accessible stores and receive stock only there", async () => {
  const { controller, commands, queries, reply, request } = setup();
  await controller.list(request(), reply);
  assert.deepEqual(queries[0], new ListPurchaseOrdersQuery([storeA, storeB]));
  await controller.create(input, request(), reply);
  assert.deepEqual(commands[0], new CreatePurchaseOrderCommand(input));
  await controller.receive("00000000-0000-4000-8000-000000000030", request(), reply);
  assert.deepEqual(commands[1], new ReceivePurchaseOrderCommand("00000000-0000-4000-8000-000000000030", [storeA, storeB]));
});

test("purchase orders reject another store and choose the employee default", async () => {
  const { controller, commands, reply, request } = setup();
  await controller.create({ ...input, storeId: "00000000-0000-4000-8000-000000000003" }, request(), reply);
  assert.equal(reply.status, 403);
  assert.equal(commands.length, 0);
  await controller.create({ ...input, storeId: undefined }, request({ role: "technician", defaultStoreId: storeA, storeAccess: [storeA] }), reply);
  assert.equal((commands[0] as CreatePurchaseOrderCommand).input.storeId, storeA);
});

test("purchase-order filter only narrows stores within the user's access", async () => {
  const { controller, queries, reply, request } = setup();
  await controller.list(request({ role: "technician", defaultStoreId: storeA, storeAccess: [storeA, storeB] }, { storeId: storeB }), reply);
  assert.deepEqual(queries[0], new ListPurchaseOrdersQuery([storeB]));
  await controller.list(request({ role: "technician", defaultStoreId: storeA, storeAccess: [storeA] }, { storeId: storeB }), reply);
  assert.equal(reply.status, 403);
});
