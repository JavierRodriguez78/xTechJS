import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { CustomerEntitySchema } from "../../customers/infrastructure/persistence/customer-entity.js";
import { DataProtectionConsentEntitySchema } from "../../customers/infrastructure/persistence/data-protection-consent-entity.js";
import { UserEntitySchema } from "../../users/infrastructure/persistence/user-entity.js";
import { ShopRegistrationVerificationTokenEntitySchema } from "../infrastructure/persistence/shop-registration-verification-token-entity.js";
import { RegisterShopCustomer, ShopRegistrationVerificationInvalidError } from "./register-shop-customer.js";

function harness(options: { verified?: boolean; existingCustomer?: boolean } = {}) {
  const token = "verified-shop-token";
  const records: { customer?: Record<string, unknown>; user?: Record<string, unknown>; consent?: Record<string, unknown>; tokenUsed?: Date } = {};
  const verification = { id: "verification-1", email: "ada@example.test", tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 60_000), verifiedAt: options.verified === false ? null : new Date(), usedAt: null };
  const repositories = new Map<unknown, unknown>([
    [ShopRegistrationVerificationTokenEntitySchema, { async findOne() { return options.verified === false ? null : verification; }, async update(_id: string, input: { usedAt: Date }) { records.tokenUsed = input.usedAt; } }],
    [CustomerEntitySchema, { async findOneBy() { return options.existingCustomer ? { id: "existing" } : null; }, async save(input: Record<string, unknown>) { records.customer = input; return { ...input, createdAt: new Date(), updatedAt: new Date() }; } }],
    [UserEntitySchema, { async save(input: Record<string, unknown>) { records.user = input; return input; } }],
    [DataProtectionConsentEntitySchema, { async save(input: Record<string, unknown>) { records.consent = input; return input; } }]
  ]);
  const service = new RegisterShopCustomer();
  (service as unknown as { dataSource: unknown }).dataSource = { transaction: async (operation: (manager: unknown) => unknown) => operation({ getRepository: (schema: unknown) => repositories.get(schema) }) };
  return { service, token, records };
}

const input = { displayName: "Ada Cliente", email: "ADA@example.test", password: "clave-de-prueba-larga-123", phone: "600123123", consentText: "Consentimiento de prueba" };

test("shop registration requires a verified, unexpired email token", async () => {
  const { service, token, records } = harness({ verified: false });

  await assert.rejects(() => service.execute(input, null, token), ShopRegistrationVerificationInvalidError);
  assert.equal(records.customer, undefined);
  assert.equal(records.user, undefined);
  assert.equal(records.consent, undefined);
});

test("creates customer, user and consent atomically and consumes the verification token", async () => {
  const { service, token, records } = harness();

  const customer = await service.execute(input, "127.0.0.1", token);

  assert.equal(customer.email, "ada@example.test");
  assert.equal(customer.registrationStatus, "completed");
  assert.equal(customer.acquisitionChannel, "self_service");
  assert.equal(records.user?.email, "ada@example.test");
  assert.notEqual(records.user?.passwordHash, input.password);
  assert.equal(records.consent?.ipAddress, "127.0.0.1");
  assert.equal(records.tokenUsed instanceof Date, true);
});

test("does not create a duplicate customer after verification", async () => {
  const { service, token, records } = harness({ existingCustomer: true });

  await assert.rejects(() => service.execute(input, null, token), /already exists/i);
  assert.equal(records.customer, undefined);
  assert.equal(records.user, undefined);
  assert.equal(records.tokenUsed, undefined);
});
