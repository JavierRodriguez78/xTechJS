import assert from "node:assert/strict";
import test from "node:test";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import type { RepairQuoteRepository } from "./repair-quote-repository.js";
import type { ChangeRepairStatus } from "./change-repair-status.js";
import { SaveRepairQuote } from "./save-repair-quote.js";

test("repair quote totals are calculated from line quantities and unit prices", async () => {
  let savedTotal = -1;
  const quotes: RepairQuoteRepository = {
    async findByRepairOrderId() { return undefined; },
    async save(repairOrderId, input) {
      savedTotal = input.totalCents;
      return { id: "quote-1", repairOrderId, lines: input.lines, totalCents: input.totalCents, status: input.status, createdAt: new Date(), updatedAt: new Date() };
    },
    async updateStatus() { return undefined; }
  };
  const repairs = { async findById() { return { id: "repair-1" }; } } as unknown as RepairOrderRepository;
  const changeStatus = { async execute() { throw new Error("Draft quotes must not change repair status"); } } as unknown as ChangeRepairStatus;
  const quote = await new SaveRepairQuote(quotes, repairs, changeStatus).execute("repair-1", {
    status: "draft",
    lines: [{ description: "Mano de obra", quantity: 2, unitPriceCents: 3500 }, { description: "Conector", quantity: 1, unitPriceCents: 1200 }]
  });

  assert.equal(savedTotal, 8200);
  assert.equal(quote?.totalCents, 8200);
});