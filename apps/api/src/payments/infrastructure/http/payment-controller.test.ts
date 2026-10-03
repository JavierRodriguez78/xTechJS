import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyRequest } from "fastify";
import type { DataSource } from "typeorm";
import type { CommandBus, QueryBus } from "@xtaskjs/cqrs";
import { PaymentController } from "./payment-controller.js";
import { CreatePaymentCommand, GetDailyPaymentSummaryQuery, GetPaymentReportQuery, ListPaymentsQuery, ListRepairPaymentsQuery, ListTpvSalesQuery } from "../../application/cqrs/payment-messages.js";
import { OpenCashRegisterCommand } from "../../application/cqrs/cash-register-messages.js";
import { SendPaymentInvoiceEmail } from "../../application/send-payment-invoice-email.js";

const storeA = "00000000-0000-4000-8000-000000000001";
const storeB = "00000000-0000-4000-8000-000000000002";
const repairA = "00000000-0000-4000-8000-000000000010";
const repairB = "00000000-0000-4000-8000-000000000011";
const paymentA = "00000000-0000-4000-8000-000000000020";
const paymentB = "00000000-0000-4000-8000-000000000021";
function setup(repairStoreIds: Record<string, string> = { [repairA]: storeA, [repairB]: storeB }, paymentStores: Record<string, string> = { [paymentA]: storeA, [paymentB]: storeB }) {
  const commands: unknown[] = [];
  const queries: unknown[] = [];
  const controller = new PaymentController(
    { execute: async (command: unknown) => { commands.push(command); return command; } } as unknown as CommandBus,
    { execute: async (query: unknown) => { queries.push(query); return []; } } as unknown as QueryBus,
    {} as SendPaymentInvoiceEmail
  );
  Object.defineProperty(controller, "dataSource", { value: { query: async (sql: string, params: unknown[]) => {
    if (sql.includes("FROM stores")) return [{ id: params[0] }];
    if (sql.includes("JOIN repair_orders") && sql.includes("payments")) return paymentStores[params[0] as string] && (params[1] as string[]).includes(paymentStores[params[0] as string]) ? [{ exists: 1 }] : [];
    if (sql.includes("FROM repair_orders")) return repairStoreIds[params[0] as string] && (params[1] as string[]).includes(repairStoreIds[params[0] as string]) ? [{ exists: 1 }] : [];
    return [];
  } } as unknown as DataSource });
  const reply = { status: 200, code(status: number) { this.status = status; return this; }, header() { return this; }, send(payload: unknown) { return payload; } };
  const request = (storeIds: string[] | null = [storeA, storeB], query: object = {}) => ({ user: { sub: "staff-1", role: storeIds === null ? "admin" : "technician", storeId: storeA, defaultStoreId: storeA, storeAccess: storeIds }, query }) as unknown as FastifyRequest;
  return { controller, commands, queries, reply, request };
}

test("payment lists, summaries and reports use only the token's store scope", async () => {
  const { controller, queries, request } = setup();
  await controller.list(request([storeA]));
  await controller.listSales(request([storeA]));
  await controller.summary("2026-10-03", request([storeA]));
  await controller.report("2026-10-01", "2026-10-03", request([storeA]), { code() { return this; }, header() { return this; }, send(value: unknown) { return value; } });
  assert.deepEqual(queries[0], new ListPaymentsQuery([storeA]));
  assert.deepEqual(queries[1], new ListTpvSalesQuery([storeA]));
  assert.deepEqual(queries[2], new GetDailyPaymentSummaryQuery("2026-10-03", [storeA]));
  assert.deepEqual(queries[3], new GetPaymentReportQuery("2026-10-01", "2026-10-03", [storeA]));
});

test("repair payments cannot be listed or created for a repair in another store", async () => {
  const { controller, commands, reply, request } = setup();
  await controller.listRepair(repairB, request([storeA]), reply);
  assert.equal(reply.status, 404);
  assert.equal(commands.length, 0);
  await controller.create({ repairOrderId: repairB, amountCents: 1000, method: "cash" }, request([storeA]), reply);
  assert.equal(reply.status, 404);
  assert.equal(commands.length, 0);
});

test("payment receipt and refunds cannot cross store scope", async () => {
  const { controller, commands, reply, request } = setup();
  await controller.receipt(paymentB, request([storeA]), reply);
  assert.equal(reply.status, 404);
  await controller.refund(paymentB, { reason: "Error de cobro" }, request([storeA]), reply);
  assert.equal(reply.status, 404);
  assert.equal(commands.length, 0);
});

test("global admin can access all stores, while a scoped admin cannot open another store's cash", async () => {
  const global = setup();
  await global.controller.openCashRegister("2026-10-03", global.request(null, { storeId: storeB }), global.reply);
  assert.deepEqual(global.commands[0], new OpenCashRegisterCommand("2026-10-03", storeB));
  const limited = setup();
  await limited.controller.openCashRegister("2026-10-03", limited.request([storeA], { storeId: storeB }), limited.reply);
  assert.equal(limited.reply.status, 403);
  assert.equal(limited.commands.length, 0);
});

test("cash uses the default store when one is assigned", async () => {
  const { controller, commands, reply, request } = setup();
  await controller.openCashRegister("2026-10-03", request([storeA]), reply);
  assert.deepEqual(commands[0], new OpenCashRegisterCommand("2026-10-03", storeA));
});
