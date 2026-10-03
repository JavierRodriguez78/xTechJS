import assert from "node:assert/strict";
import test from "node:test";
import { CustomerEntitySchema } from "../../customers/infrastructure/persistence/customer-entity.js";
import { EcommerceOrderEntitySchema, EcommerceOrderLineEntitySchema, EcommerceProductEntitySchema } from "../infrastructure/persistence/ecommerce-entity.js";
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

test("checkout persists optional billing data and copies the contact address when selected", async () => {
  const customer = { id: "customer-1", addressStreet: "Calle Uno 1", addressPostalCode: "28001", addressCity: "Madrid", addressProvince: "Madrid", addressCountry: "España" };
  const product = { id: "product-1", sku: "SW-1", title: "Consola", description: "", category: "console", condition: "used_good", priceCents: 10000, currency: "EUR", stockQuantity: 1, published: true, sourceInventoryItemId: null, sourceTradeInRequestId: null, createdAt: new Date(), updatedAt: new Date() };
  let customerUpdates: Record<string, unknown> | undefined;
  const repositories = new Map<unknown, unknown>([
    [CustomerEntitySchema, { async findOneBy() { return customer; }, async update(_id: string, input: Record<string, unknown>) { customerUpdates = input; } }],
    [EcommerceProductEntitySchema, { async findOne() { return product; }, async save() {} }],
    [EcommerceOrderEntitySchema, { async save(input: Record<string, unknown>) { return { ...input, createdAt: new Date(), updatedAt: new Date() }; } }],
    [EcommerceOrderLineEntitySchema, { async save(input: unknown) { return input; } }]
  ]);
  const service = new EcommerceService();
  (service as unknown as { dataSource: unknown }).dataSource = { async transaction<T>(operation: (manager: unknown) => Promise<T>) { return operation({ getRepository: (schema: unknown) => repositories.get(schema) }); } };

  await service.placeOrder("customer-1", {
    lines: [{ productId: "product-1", quantity: 1 }],
    shippingAddress: { street: "Entrega 2", postalCode: "28002", city: "Madrid", province: "Madrid", country: "España" },
    customerType: "individual",
    billingName: "Ada Cliente",
    useContactAddressForBilling: true
  });

  assert.equal(customerUpdates?.customerType, "individual");
  assert.equal(customerUpdates?.billingName, "Ada Cliente");
  assert.equal(customerUpdates?.billingAddressStreet, "Calle Uno 1");
  assert.equal(customerUpdates?.billingAddressPostalCode, "28001");
  assert.equal(customerUpdates?.billingAddressCountry, "España");
});
