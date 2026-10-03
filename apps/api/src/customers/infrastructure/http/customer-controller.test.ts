import assert from "node:assert/strict";
import { hash } from "bcryptjs";
import test from "node:test";
import { CustomerRegistrationTokenEntitySchema } from "../persistence/customer-registration-token-entity.js";
import { CustomerEntitySchema } from "../persistence/customer-entity.js";
import { DataProtectionConsentEntitySchema } from "../persistence/data-protection-consent-entity.js";
import type { Customer } from "../../domain/customer.js";
import { UserEntitySchema } from "../../../users/infrastructure/persistence/user-entity.js";
import { CustomerController } from "./customer-controller.js";

const rawToken = "customer-invitation-token";
const customer: Customer = {
  id: "customer-1", displayName: "Ada Cliente", email: "ada@example.test", phone: null, address: "Dirección antigua",
  addressStreet: null, addressPostalCode: null, addressCity: null, addressProvince: null, addressCountry: null,
  taxId: null, customerType: "individual", internalNotes: null, registrationStatus: "pending", acquisitionChannel: "staff", originStoreId: null,
  billingName: "Ada Cliente", billingTaxId: "X1234567A", billingAddressStreet: "Calle Uno 1", billingAddressPostalCode: "28001", billingAddressCity: "Madrid", billingAddressProvince: "Madrid", billingAddressCountry: "España", tags: [], createdAt: new Date(), updatedAt: new Date()
};

async function createController(customerRecord = customer) {
  const tokenRecord = { id: "token-1", customerId: customer.id, tokenHash: await hash(rawToken, 4), expiresAt: new Date(Date.now() + 60_000), usedAt: null };
  const saved: Record<string, unknown> = {};
  const repositories = new Map<unknown, unknown>([
    [CustomerRegistrationTokenEntitySchema, { async find() { return [tokenRecord]; }, async findOne() { return tokenRecord.usedAt ? null : tokenRecord; }, async update(_id: string, input: Record<string, unknown>) { Object.assign(tokenRecord, input); saved.token = input; } }],
    [CustomerEntitySchema, { async findOneBy() { return customerRecord; }, async update(_id: string, input: Record<string, unknown>) { saved.customer = input; } }],
    [UserEntitySchema, { async save(input: Record<string, unknown>) { saved.user = input; } }],
    [DataProtectionConsentEntitySchema, { async save(input: Record<string, unknown>) { saved.consent = input; } }]
  ]);
  const dataSource = {
    getRepository: (schema: unknown) => repositories.get(schema),
    async transaction<T>(operation: (manager: unknown) => Promise<T>): Promise<T> { return operation({ getRepository: (schema: unknown) => repositories.get(schema) }); }
  };
  return { controller: new CustomerController(dataSource as never, {} as never, {} as never), saved };
}

function reply() {
  const result: { status?: number; payload?: unknown } = {};
  return { result, code(status: number) { result.status = status; return this; }, send(payload: unknown) { result.payload = payload; return payload; } };
}

test("invitation completion uses staff-prefilled billing details and records consent", async () => {
  const { controller, saved } = await createController();
  const response = reply();

  const result = await controller.completeCustomerRegistration(rawToken, { password: "una-clave-muy-segura-123", consentAccepted: true, consentText: "Consentimiento probado" }, { ip: "127.0.0.1" } as never, response);

  assert.deepEqual(result, { message: "Registration completed successfully" });
  assert.equal(saved.user && (saved.user as Record<string, unknown>).email, "ada@example.test");
  assert.equal((saved.customer as Record<string, unknown>).billingAddressStreet, "Calle Uno 1");
  assert.equal((saved.customer as Record<string, unknown>).registrationStatus, "completed");
  assert.equal((saved.consent as Record<string, unknown>).ipAddress, "127.0.0.1");
  assert.ok(saved.token);
});

test("invitation completion rejects insufficient combined billing data without consuming the token", async () => {
  const incompleteCustomer = { ...customer, billingAddressPostalCode: null, billingAddressCity: null, billingAddressProvince: null, billingAddressCountry: null };
  const { controller, saved } = await createController(incompleteCustomer);
  const response = reply();

  const result = await controller.completeCustomerRegistration(rawToken, { password: "una-clave-muy-segura-123", consentAccepted: true, consentText: "Consentimiento probado" }, { ip: null } as never, response);

  assert.equal(response.result.status, 400);
  assert.match(String((result as { message: string }).message), /facturación/i);
  assert.equal(saved.user, undefined);
  assert.equal(saved.token, undefined);
});

test("customer self-profile excludes internal CRM fields", async () => {
  const { controller } = await createController();
  const response = reply();

  const profile = await controller.getOwnCustomer({ user: { sub: customer.id, role: "customer" } } as never, response);

  assert.equal((profile as Record<string, unknown>).email, customer.email);
  assert.equal(Object.hasOwn(profile as object, "internalNotes"), false);
  assert.equal(Object.hasOwn(profile as object, "acquisitionChannel"), false);
});
