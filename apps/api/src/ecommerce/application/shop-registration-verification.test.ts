import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { CustomerEntitySchema } from "../../customers/infrastructure/persistence/customer-entity.js";
import { ShopRegistrationVerificationTokenEntitySchema } from "../infrastructure/persistence/shop-registration-verification-token-entity.js";
import { ShopRegistrationVerification } from "./shop-registration-verification.js";

function createService(options: { existingCustomer?: boolean; tokenRecord?: Record<string, unknown> } = {}) {
  const state: { savedToken?: Record<string, unknown>; tokenUpdate?: Record<string, unknown>; message?: Record<string, unknown> } = {};
  const tokenRepository = {
    async update(_criteria: unknown, input: Record<string, unknown>) { state.tokenUpdate = input; },
    async save(input: Record<string, unknown>) { state.savedToken = input; return input; },
    async findOne() { return options.tokenRecord ?? null; }
  };
  const manager = { getRepository(schema: unknown) {
    if (schema === CustomerEntitySchema) return { async findOneBy() { return options.existingCustomer ? { id: "existing-customer" } : null; } };
    return tokenRepository;
  } };
  const dataSource = {
    async transaction<T>(operation: (transactionManager: typeof manager) => Promise<T>): Promise<T> { return operation(manager); },
    getRepository: () => tokenRepository
  };
  const mailer = { async sendMail(message: Record<string, unknown>) { state.message = message; } };
  const service = new ShopRegistrationVerification(mailer as never);
  (service as unknown as { dataSource: unknown }).dataSource = dataSource;
  return { service, state };
}

test("requests a hashed short-lived verification token and emails its raw link", async () => {
  const { service, state } = createService();
  const before = Date.now();

  await service.request(" ADA@EXAMPLE.TEST ");

  assert.equal(state.savedToken?.email, "ada@example.test");
  assert.equal(String(state.savedToken?.tokenHash).length, 64);
  assert.ok((state.savedToken?.expiresAt as Date).getTime() - before <= 30 * 60 * 1000 + 1000);
  assert.equal(state.message?.to, "ada@example.test");
  const body = String(state.message?.text);
  const token = body.match(/token=([a-f0-9]{64})/)?.[1];
  assert.ok(token);
  assert.notEqual(state.savedToken?.tokenHash, token);
  assert.equal(createHash("sha256").update(token).digest("hex"), state.savedToken?.tokenHash);
});

test("does not create or email a registration attempt for an existing customer", async () => {
  const { service, state } = createService({ existingCustomer: true });

  await service.request("ada@example.test");

  assert.equal(state.savedToken, undefined);
  assert.equal(state.message, undefined);
});

test("marks a valid token verified without consuming it", async () => {
  const token = "verification-token";
  const tokenRecord = { id: "token-1", email: "ada@example.test", tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 60_000), verifiedAt: null, usedAt: null };
  const { service, state } = createService({ tokenRecord });

  assert.equal(await service.verify(token), "ada@example.test");
  assert.ok(state.tokenUpdate?.verifiedAt instanceof Date);
  assert.equal(state.tokenUpdate?.usedAt, undefined);
  assert.equal(tokenRecord.usedAt, null);
});
