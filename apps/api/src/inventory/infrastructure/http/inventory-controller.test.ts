import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyRequest } from "fastify";
import type { CommandBus, QueryBus } from "@xtaskjs/cqrs";
import { InventoryController } from "./inventory-controller.js";
import { CreateInventoryItemCommand, GetInventoryMovementsQuery, ListInventoryItemsQuery, ListLowStockItemsQuery } from "../../application/cqrs/inventory-messages.js";
import { GetRepairOrderQuery } from "../../../repairs/application/cqrs/repair-messages.js";

const storeA = "00000000-0000-4000-8000-000000000001";
const storeB = "00000000-0000-4000-8000-000000000002";
function setup(repairStoreId: string | null = storeA) {
  const commands: unknown[] = [];
  const queries: unknown[] = [];
  const transfers: unknown[] = [];
  const controller = new InventoryController(
    { execute: async (command: unknown) => { commands.push(command); return { id: "item-1" }; } } as unknown as CommandBus,
    { execute: async (query: unknown) => { queries.push(query); if (query instanceof GetRepairOrderQuery) return repairStoreId ? { id: "repair-1", storeId: repairStoreId } : undefined; return []; } } as unknown as QueryBus,
    { execute: async (...args: unknown[]) => { transfers.push(args); return {}; }, list: async (...args: unknown[]) => { transfers.push(args); return []; }, send: async (...args: unknown[]) => { transfers.push(args); return {}; }, receive: async (...args: unknown[]) => { transfers.push(args); return {}; }, cancel: async (...args: unknown[]) => { transfers.push(args); return {}; } } as never
  );
  const reply = { status: 200, code(status: number) { this.status = status; return this; }, send(payload: unknown) { return payload; } };
  const request = (query: object = {}, user: object = { sub: "tech-1", role: "technician", defaultStoreId: storeA, storeId: storeA, storeAccess: [storeA, storeB] }) => ({ query, user }) as unknown as FastifyRequest;
  return { controller, commands, queries, transfers, reply, request };
}

const createItem = { sku: "SKU-1", name: "Cable USB-C", minimumStock: 2 };

test("technician can select any assigned inventory store, but not an external store", async () => {
  const { controller, commands, queries, reply, request } = setup();
  await controller.list(request({ storeId: storeB }), reply);
  assert.deepEqual(queries[0], new ListInventoryItemsQuery(storeB));
  await controller.lowStock(request({ storeId: "00000000-0000-4000-8000-000000000003" }), reply);
  assert.equal(reply.status, 403);
  assert.equal(queries.length, 1);
});

test("creating a catalog item initializes stock only in the actor's accessible stores", async () => {
  const { controller, commands, reply, request } = setup();
  await controller.create(createItem, request(), reply);
  assert.deepEqual(commands[0], new CreateInventoryItemCommand(createItem, [storeA, storeB]));
  const global = setup();
  await global.controller.create(createItem, global.request({}, { sub: "admin", role: "admin", defaultStoreId: null, storeId: null, storeAccess: null }), global.reply);
  assert.deepEqual(global.commands[0], new CreateInventoryItemCommand(createItem, null));
});

test("inventory adjustment cannot use a store outside the token scope", async () => {
  const { controller, commands, reply, request } = setup();
  await controller.adjust("00000000-0000-4000-8000-000000000010", { storeId: "00000000-0000-4000-8000-000000000003", quantity: 1, type: "receipt" }, request(), reply);
  assert.equal(reply.status, 403);
  assert.equal(commands.length, 0);
});

test("inventory consumption verifies the repair store before applying stock", async () => {
  const denied = setup("00000000-0000-4000-8000-000000000003");
  await denied.controller.consume("item-1", { repairOrderId: "00000000-0000-4000-8000-000000000020", quantity: 1 }, denied.request(), denied.reply);
  assert.equal(denied.reply.status, 404);
  assert.equal(denied.commands.length, 0);
  const allowed = setup(storeB);
  await allowed.controller.consume("item-1", { repairOrderId: "00000000-0000-4000-8000-000000000020", quantity: 1 }, allowed.request(), allowed.reply);
  assert.equal(allowed.commands.length, 1);
});

test("transfers require access to both origin and destination", async () => {
  const { controller, transfers, reply, request } = setup();
  await controller.transfer({ originStoreId: storeA, destinationStoreId: "00000000-0000-4000-8000-000000000003", lines: [{ inventoryItemId: "00000000-0000-4000-8000-000000000010", quantity: 1 }] }, request(), reply);
  assert.equal(reply.status, 403);
  assert.equal(transfers.length, 0);
  await controller.transfer({ originStoreId: storeA, destinationStoreId: storeB, lines: [{ inventoryItemId: "00000000-0000-4000-8000-000000000010", quantity: 1 }] }, request(), reply);
  assert.equal(transfers.length, 1);
});
