import assert from "node:assert/strict";
import test from "node:test";
import { SendEcommerceOrderInvoiceEmail } from "./send-ecommerce-order-invoice-email.js";

const order = { id: "order-1", customerId: "customer-1", invoiceSeries: "E", invoiceNumber: 8 };

test("emails the ecommerce invoice PDF to the order customer", async () => {
  const sent: unknown[] = [];
  const getInvoicePdf = { async execute() { return Buffer.from("%PDF-test"); } };
  const mailer = { async sendMail(message: unknown) { sent.push(message); } };
  const service = new SendEcommerceOrderInvoiceEmail(getInvoicePdf as never, mailer as never);
  (service as unknown as { dataSource: unknown }).dataSource = { getRepository(schema: { options: { name: string } }) { return schema.options.name === "EcommerceOrder" ? { async findOneBy() { return order; } } : { async findOneBy() { return { id: "customer-1", email: "ada@example.test" }; } }; } };

  const result = await service.execute(order.id);

  assert.deepEqual(result, { recipient: "ada@example.test", status: "sent" });
  assert.equal(sent.length, 1);
  assert.match(JSON.stringify(sent[0]), /factura-E-000008\.pdf/);
});
