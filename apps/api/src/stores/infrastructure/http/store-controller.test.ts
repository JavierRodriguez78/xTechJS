import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyRequest } from "fastify";
import { StoreController } from "./store-controller.js";
import { STORE_WEEK_DAYS, type StoreDayOpeningHours } from "../../domain/store.js";

const input = { name: "Taller Madrid", addressStreet: "Calle Uno 1", addressPostalCode: "28001", addressCity: "Madrid", addressProvince: "Madrid", addressCountry: "España", invoiceSeriesPrefix: "MAD-", email: "", logoUrl: "" };

const weeklyOpeningHours: StoreDayOpeningHours[] = STORE_WEEK_DAYS.map((day, index) => index < 5
  ? { day, open: true, opensAt: "09:00", closesAt: "18:00" }
  : { day, open: false, opensAt: null, closesAt: null });

function setup(valid = true) {
  const controller = new StoreController();
  const saved: unknown[] = [];
  const existing = { ...input, phone: "910000000", taxId: "NIF_EXISTENTE", email: "taller@example.org", active: true };
  const repository = { save: async (record: unknown) => { saved.push(record); return record; }, findOneBy: async () => existing };
  Object.defineProperty(controller, "dataSource", { value: { getRepository: () => repository, query: async () => valid ? [{ exists: 1 }] : [] } });
  const reply = { status: 200, payload: undefined as unknown, code(status: number) { this.status = status; return this; }, send(payload: unknown) { this.payload = payload; return payload; } };
  return { controller, saved, reply };
}

test("a store accepts empty optional email and logo with a catalog address", async () => {
  const { controller, saved, reply } = setup();
  await controller.create(input, reply);
  assert.equal(reply.status, 201);
  assert.equal(saved.length, 1);
  assert.equal((saved[0] as { email: unknown }).email, null);
  assert.equal((saved[0] as { logoUrl: unknown }).logoUrl, null);
});

test("a store rejects an unknown postal combination before persisting", async () => {
  const { controller, saved, reply } = setup(false);
  await controller.create(input, reply);
  assert.equal(reply.status, 400);
  assert.equal(saved.length, 0);
});

test("toggling a legacy store does not reset contact and fiscal data", async () => {
  const { controller, saved, reply } = setup(false);
  await controller.update("store-1", { active: false }, reply);
  assert.equal(reply.status, 200);
  assert.equal((saved[0] as { phone: string }).phone, "910000000");
  assert.equal((saved[0] as { taxId: string }).taxId, "NIF_EXISTENTE");
});

test("a partial address change recalculates the full compatibility address", async () => {
  const { controller, saved, reply } = setup();
  await controller.update("store-1", { addressCity: "Otra poblacion" }, reply);
  assert.equal(reply.status, 200);
  assert.equal((saved[0] as { address: string }).address, "Calle Uno 1, 28001 Otra poblacion, Madrid, España");
});

test("postal places accept the alphabetic province codes supplied by GeoNames", async () => {
  const { controller, reply } = setup();
  const result = await controller.places({ query: { provinceCode: "M" } } as FastifyRequest, reply);
  assert.equal(reply.status, 200);
  assert.ok(Array.isArray(result));
  await controller.places({ query: { provinceCode: "invalid" } } as FastifyRequest, reply);
  assert.equal(reply.status, 400);
});

test("a store saves separate open and closed days", async () => {
  const { controller, saved, reply } = setup();
  await controller.create({ ...input, weeklyOpeningHours }, reply);
  assert.equal(reply.status, 201);
  assert.deepEqual((saved[0] as { weeklyOpeningHours: unknown }).weeklyOpeningHours, weeklyOpeningHours);
});

test("a schedule-only update preserves contact and address fields", async () => {
  const { controller, saved, reply } = setup(false);
  await controller.update("store-1", { weeklyOpeningHours }, reply);
  assert.equal(reply.status, 200);
  assert.deepEqual((saved[0] as { weeklyOpeningHours: unknown }).weeklyOpeningHours, weeklyOpeningHours);
  assert.equal((saved[0] as { phone: string }).phone, "910000000");
});

test("invalid weekly schedules are rejected before persistence", async () => {
  const invalidSchedules = [
    weeklyOpeningHours.slice(1),
    weeklyOpeningHours.map((day) => ({ ...day, day: "monday" })),
    weeklyOpeningHours.map((day) => day.open ? { ...day, opensAt: "25:00" } : day),
    weeklyOpeningHours.map((day) => day.open ? { ...day, closesAt: "09:00" } : day),
    weeklyOpeningHours.map((day) => day.open ? { ...day, closesAt: "08:00" } : day),
    weeklyOpeningHours.map((day) => day.open ? day : { ...day, opensAt: "09:00" })
  ];
  for (const schedule of invalidSchedules) {
    const { controller, saved, reply } = setup();
    await controller.create({ ...input, weeklyOpeningHours: schedule }, reply);
    assert.equal(reply.status, 400);
    await controller.update("store-1", { weeklyOpeningHours: schedule }, reply);
    assert.equal(reply.status, 400);
    assert.equal(saved.length, 0);
  }
});

test("session store uses the authenticated store ID and returns only its public identity", async () => {
  const { controller, reply } = setup();
  let requestedId: string | undefined;
  Object.defineProperty(controller, "dataSource", { value: { getRepository: () => ({ findOneBy: async ({ id }: { id: string }) => {
    requestedId = id;
    return { id, name: "Taller Madrid", active: true, taxId: "PRIVATE" };
  } }) }, configurable: true });
  const result = await controller.sessionStore({ user: { role: "technician", storeId: "own-store" }, query: { storeId: "other-store" } } as unknown as FastifyRequest, reply);
  assert.equal(requestedId, "own-store");
  assert.deepEqual(result, { id: "own-store", name: "Taller Madrid", active: true });
});

test("session store rejects customers and handles unassigned staff", async () => {
  const { controller, reply } = setup();
  assert.equal(await controller.sessionStore({ user: { role: "technician", storeId: null } } as unknown as FastifyRequest, reply), null);
  await controller.sessionStore({ user: { role: "customer", storeId: "store-1" } } as unknown as FastifyRequest, reply);
  assert.equal(reply.status, 403);
});