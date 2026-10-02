import assert from "node:assert/strict";
import test from "node:test";
import type { EcommerceOrder } from "../domain/ecommerce.js";
import { EcommerceService } from "./ecommerce-service.js";

function pendingOrder(): EcommerceOrder {
  return { id: "order-1", customerId: "customer-1", totalCents: 24900, status: "pending_payment", shippingAddress: { street: "Calle Uno", postalCode: "28001", city: "Madrid", province: "Madrid", country: "España" }, paymentProvider: "manual", paymentReference: null, invoiceSeries: null, invoiceNumber: null, createdAt: new Date(), updatedAt: new Date() };
}

test("marking an ecommerce order as paid assigns its invoice number", async () => {
  const order = pendingOrder();
  const service = new EcommerceService();
  const repository = {
    async findOne() { return order; },
    async save(value: EcommerceOrder) { return value; }
  };
  (service as unknown as { dataSource: unknown }).dataSource = { async transaction<T>(operation: (manager: { getRepository(): typeof repository; query(statement: string): Promise<{ number: string }[]> }) => Promise<T>) { return operation({ getRepository: () => repository, async query() { return [{ number: "8" }]; } }); } };

  const result = await service.markOrderPaid(order.id, "TRANSFER-42");

  assert.equal(result?.status, "paid");
  assert.equal(result?.invoiceSeries, "E");
  assert.equal(result?.invoiceNumber, 8);
  assert.equal(result?.paymentReference, "TRANSFER-42");
});
