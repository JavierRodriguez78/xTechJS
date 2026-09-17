import assert from "node:assert/strict";
import test from "node:test";
import type { MailerService } from "@xtaskjs/mailer";
import type { Customer } from "../domain/customer.js";
import type { CustomerRegistrationTokenRecord, CustomerRegistrationTokenRepository } from "./customer-repository.js";
import { SendCustomerRegistrationEmail } from "./send-customer-registration-email.js";

const customer = { id: "customer-1", email: "cliente@example.com" } as Customer;

function createRepository(deliveries: Array<{ status: "sent" | "failed"; error?: string }>): CustomerRegistrationTokenRepository {
  return {
    async createForCustomer(_customerId, _token, expiresAt) {
      return { id: "token-1", customerId: customer.id, tokenHash: "hash", expiresAt, usedAt: null, deliveryStatus: "pending", deliveryError: null, createdAt: new Date() };
    },
    async markDelivery(_id, status, error) { deliveries.push({ status, error }); },
    async findValidByToken() { return undefined; },
    async markUsed() {}
  };
}

test("records a sent registration invitation", async () => {
  const deliveries: Array<{ status: "sent" | "failed"; error?: string }> = [];
  const mailer = { async sendMail() {} } as unknown as MailerService;

  await new SendCustomerRegistrationEmail(createRepository(deliveries), mailer).execute(customer);

  assert.deepEqual(deliveries, [{ status: "sent", error: undefined }]);
});

test("records a failed registration invitation before propagating the mail error", async () => {
  const deliveries: Array<{ status: "sent" | "failed"; error?: string }> = [];
  const mailer = { async sendMail() { throw new Error("SMTP unavailable"); } } as unknown as MailerService;

  await assert.rejects(() => new SendCustomerRegistrationEmail(createRepository(deliveries), mailer).execute(customer), /SMTP unavailable/);
  assert.deepEqual(deliveries, [{ status: "failed", error: "SMTP unavailable" }]);
});