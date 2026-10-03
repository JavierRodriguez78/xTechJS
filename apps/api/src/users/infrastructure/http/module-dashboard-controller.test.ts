import assert from "node:assert/strict";
import test from "node:test";
import { ModuleDashboardController } from "./module-dashboard-controller.js";

const storeA = "00000000-0000-4000-8000-000000000001";
const storeB = "00000000-0000-4000-8000-000000000002";

function setup(user: Record<string, unknown>, answers: (sql: string) => unknown[] = () => [], query?: Record<string, unknown>) {
  const statements: { sql: string; params: unknown[] }[] = [];
  const controller = new ModuleDashboardController();
  (controller as unknown as { dataSource: unknown }).dataSource = { async query(sql: string, params: unknown[] = []) { statements.push({ sql, params }); return answers(sql); } };
  return { controller, statements, request: { user, query: query ?? {} } as never };
}

function reply() {
  const result: { status?: number; payload?: unknown } = {};
  return { result, code(status: number) { result.status = status; return this; }, send(payload: unknown) { result.payload = payload; return payload; } };
}

test("attention dashboard applies the technician store scope to each dataset", async () => {
  const { controller, statements, request } = setup({ sub: "tech-1", role: "technician", storeId: storeA, defaultStoreId: storeA, storeAccess: [storeA] }, (sql) => {
    if (sql.includes("AS total")) return [{ total: 2, in_progress: 1, finished: 1 }];
    if (sql.includes("FROM customers")) return [{ count: 3 }];
    if (sql.includes("LEFT JOIN users")) return [{ name: "Eva", count: 2 }];
    return [{ status: "repairing", count: 1 }];
  });

  const summary = await controller.attention(request, reply());

  assert.equal((summary as { storeIds: string[] }).storeIds[0], storeA);
  assert.equal((summary as { total: number }).total, 2);
  assert.equal(statements.length, 4);
  assert.ok(statements.every(({ sql }) => sql.includes("store_id = ANY($3::uuid[])") || sql.includes("origin_store_id = ANY($3::uuid[])")));
  assert.ok(statements.every(({ params }) => params[2] === undefined || JSON.stringify(params[2]) === JSON.stringify([storeA])));
});

test("dashboard rejects an explicitly selected store outside the token scope", async () => {
  const { controller, statements, request } = setup({ sub: "tech-1", role: "technician", storeId: storeA, storeAccess: [storeA] }, () => [], { storeId: storeB });
  const response = reply();

  await controller.attention(request, response);

  assert.equal(response.result.status, 403);
  assert.equal(statements.length, 0);
});

test("inventory dashboard applies the selected period and store to purchase orders", async () => {
  const { controller, statements, request } = setup({ sub: "tech-1", role: "technician", storeId: storeA, storeAccess: [storeA] }, () => []);

  await controller.inventory(request, reply());

  const purchaseQuery = statements.find(({ sql }) => sql.includes("FROM purchase_orders"));
  assert.ok(purchaseQuery);
  assert.match(purchaseQuery.sql, /created_at BETWEEN \$1 AND \$2/);
  assert.match(purchaseQuery.sql, /store_id = ANY\(\$3::uuid\[\]\)/);
  assert.deepEqual(purchaseQuery.params[2], [storeA]);
});

test("online sales are included for a global admin but omitted from scoped dashboards", async () => {
  const global = setup({ sub: "admin-1", role: "admin", storeId: null, defaultStoreId: null, storeAccess: null }, (sql) => {
    if (sql.includes("SELECT line.title_snapshot")) return [{ name: "Switch OLED", quantity: 2, cents: "35000" }];
    if (sql.includes("ecommerce_orders")) return [{ count: 2, cents: "35000", units_sold: 9 }];
    return [];
  });
  const globalSummary = await global.controller.sales(global.request, reply()) as { onlineSales: { count: number; cents: number; unitsSold: number } };
  assert.deepEqual(globalSummary.onlineSales, { count: 2, cents: 35000, unitsSold: 9, topProducts: [{ name: "Switch OLED", quantity: 2, cents: "35000" }] });
  assert.equal(global.statements.some(({ sql }) => sql.includes("ecommerce_orders")), true);

  const scoped = setup({ sub: "tech-1", role: "technician", storeId: storeA, storeAccess: [storeA] }, () => []);
  const scopedSummary = await scoped.controller.sales(scoped.request, reply()) as { onlineSales: unknown };
  assert.equal(scopedSummary.onlineSales, null);
  assert.equal(scoped.statements.some(({ sql }) => sql.includes("ecommerce_orders")), false);
});
