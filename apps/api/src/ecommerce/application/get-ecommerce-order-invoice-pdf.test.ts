import assert from "node:assert/strict";
import test from "node:test";
import { GetEcommerceOrderInvoicePdf } from "./get-ecommerce-order-invoice-pdf.js";

const order = { id: "order-1", customerId: "customer-1", totalCents: 24900, status: "paid", shippingAddress: { street: "Calle Uno", postalCode: "28001", city: "Madrid", province: "Madrid", country: "España" }, paymentProvider: "manual", paymentReference: "TRANSFER-42", invoiceSeries: "E", invoiceNumber: 8, createdAt: new Date(), updatedAt: new Date() };
const customer = { id: "customer-1", displayName: "Ada Cliente", email: "ada@example.test", phone: null, address: null, addressStreet: null, addressPostalCode: null, addressCity: null, addressProvince: null, addressCountry: null, taxId: null, customerType: "individual", internalNotes: null, registrationStatus: "completed", acquisitionChannel: "self_service", billingName: "Ada Cliente", billingTaxId: null, billingAddressStreet: "Calle Uno", billingAddressPostalCode: "28001", billingAddressCity: "Madrid", billingAddressProvince: "Madrid", billingAddressCountry: "España", tags: [], createdAt: new Date(), updatedAt: new Date() };

test("renders a PDF invoice from paid ecommerce order snapshots", async () => {
  const service = new GetEcommerceOrderInvoicePdf();
  (service as unknown as { dataSource: unknown }).dataSource = {
    getRepository(schema: { options: { name: string } }) {
      if (schema.options.name === "EcommerceOrder") return { async findOneBy() { return order; } };
      if (schema.options.name === "Customer") return { async findOneBy() { return customer; } };
      return { async find() { return [{ id: "line-1", orderId: order.id, productId: "product-1", titleSnapshot: "Consola revisada", quantity: 1, unitPriceCentsSnapshot: 24900 }]; } };
    }
  };

  const document = await service.execute(order.id);

  assert.ok(document);
  assert.equal(document.subarray(0, 4).toString(), "%PDF");
});

test("does not render an invoice before payment and numbering", async () => {
  const service = new GetEcommerceOrderInvoicePdf();
  (service as unknown as { dataSource: unknown }).dataSource = { getRepository() { return { async findOneBy() { return { ...order, status: "pending_payment", invoiceSeries: null, invoiceNumber: null }; } }; } };

  assert.equal(await service.execute(order.id), undefined);
});
