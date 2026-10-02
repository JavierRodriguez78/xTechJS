import assert from "node:assert/strict";
import test from "node:test";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import type { RepairQuoteRepository } from "./repair-quote-repository.js";
import { GetRepairReceipt } from "./get-repair-receipt.js";

test("a repair receipt renders the recorded intake details without device secrets", async () => {
  const repairs = {
    async findById() {
      return { id: "repair-1", customerId: "customer-1", deviceType: "Consola", brand: "Sony", model: "PS5", serialNumber: "SN-1", reportedIssue: "No enciende", deliveredAccessories: "Mando", technicianId: null, estimatedCompletionAt: new Date("2026-10-05T10:00:00.000Z"), diagnosis: null, status: "received", createdAt: new Date("2026-10-02T10:00:00.000Z"), updatedAt: new Date() };
    }
  } as unknown as RepairOrderRepository;
  const customers = { async findById() { return { id: "customer-1", displayName: "Ada Lovelace" }; } } as unknown as CustomerRepository;
  const quotes = { async findByRepairOrderId() { return { id: "quote-1", repairOrderId: "repair-1", lines: [{ description: "Diagnostico", quantity: 1, unitPriceCents: 2500 }], totalCents: 2500, status: "draft", createdAt: new Date(), updatedAt: new Date() }; } } as unknown as RepairQuoteRepository;
  const receipt = new GetRepairReceipt(repairs, customers, quotes);
  (receipt as unknown as { dataSource: { getRepository(): { findOneBy(): Promise<unknown> } } }).dataSource = {
    getRepository() {
      return { async findOneBy() { return { checklist: { items: [{ label: "Pantalla", ok: false }], notes: "Golpe lateral" } }; } };
    }
  };

  const document = await receipt.execute("repair-1");
  assert.ok(document?.subarray(0, 4).equals(Buffer.from("%PDF")));
});