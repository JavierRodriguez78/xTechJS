import assert from "node:assert/strict";
import test from "node:test";
import { ListRepairOrders } from "./list-repair-orders.js";
import type { RepairOrderListOptions, RepairOrderRepository } from "./repair-order-repository.js";

test("repair listing delegates server pagination, filters and sorting to its repository", async () => {
  let received: RepairOrderListOptions | undefined;
  const repository = {
    async findPage(options: RepairOrderListOptions) {
      received = options;
      return { items: [], total: 42, page: options.page, pageSize: options.pageSize };
    }
  } as unknown as RepairOrderRepository;
  const options: RepairOrderListOptions = { query: "sony", status: "repairing", technicianId: "00000000-0000-4000-8000-000000000001", deviceType: "Consola", customerId: "00000000-0000-4000-8000-000000000002", receivedFrom: new Date("2026-01-01"), receivedTo: new Date("2026-02-01"), sort: "brand:asc", page: 2, pageSize: 25 };

  const page = await new ListRepairOrders(repository).execute(options);

  assert.equal(page.total, 42);
  assert.deepEqual(received, options);
});
