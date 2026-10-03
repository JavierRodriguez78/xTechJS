import assert from "node:assert/strict";
import test from "node:test";
import type { CreateCustomerInput, Customer, UpdateCustomerInput } from "../domain/customer.js";
import type { CustomerListOptions, CustomerPage, CustomerRepository, NewCustomerRecord } from "./customer-repository.js";
import { CreateCustomer } from "./create-customer.js";
import { UpdateCustomer } from "./update-customer.js";

class TestCustomerRepository implements CustomerRepository {
  async create(input: NewCustomerRecord): Promise<Customer> {
    return {
      id: "customer-1",
      displayName: input.displayName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: null,
      addressStreet: input.addressStreet ?? null,
      addressPostalCode: input.addressPostalCode ?? null,
      addressCity: input.addressCity ?? null,
      addressProvince: input.addressProvince ?? null,
      addressCountry: input.addressCountry ?? null,
      taxId: input.taxId ?? null,
      customerType: input.customerType ?? null,
      billingName: input.billingName ?? null,
      billingTaxId: input.billingTaxId ?? null,
      billingAddressStreet: input.billingAddressStreet ?? null,
      billingAddressPostalCode: input.billingAddressPostalCode ?? null,
      billingAddressCity: input.billingAddressCity ?? null,
      billingAddressProvince: input.billingAddressProvince ?? null,
      billingAddressCountry: input.billingAddressCountry ?? null,
      internalNotes: input.internalNotes ?? null,
      registrationStatus: "pending",
      acquisitionChannel: input.acquisitionChannel ?? "staff",
      originStoreId: input.originStoreId ?? null,
      tags: input.tags ?? [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async findAll(): Promise<readonly Customer[]> {
    return [];
  }

  async findPage(options: CustomerListOptions): Promise<CustomerPage> {
    return { items: [], total: 0, page: options.page, pageSize: options.pageSize };
  }

  async findById(): Promise<Customer | undefined> {
    return undefined;
  }

  async findByEmail(): Promise<Customer | undefined> {
    return undefined;
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer | undefined> {
    return {
      id,
      displayName: input.displayName ?? "Marta Ruiz",
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: null,
      addressStreet: input.addressStreet ?? null,
      addressPostalCode: input.addressPostalCode ?? null,
      addressCity: input.addressCity ?? null,
      addressProvince: input.addressProvince ?? null,
      addressCountry: input.addressCountry ?? null,
      taxId: input.taxId ?? null,
      customerType: input.customerType ?? null,
      billingName: input.billingName ?? null,
      billingTaxId: input.billingTaxId ?? null,
      billingAddressStreet: input.billingAddressStreet ?? null,
      billingAddressPostalCode: input.billingAddressPostalCode ?? null,
      billingAddressCity: input.billingAddressCity ?? null,
      billingAddressProvince: input.billingAddressProvince ?? null,
      billingAddressCountry: input.billingAddressCountry ?? null,
      internalNotes: input.internalNotes ?? null,
      registrationStatus: "pending",
      acquisitionChannel: input.acquisitionChannel ?? "staff",
      originStoreId: input.originStoreId ?? null,
      tags: input.tags ?? [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}

test("customer creation requires an email and starts as pending registration", async () => {
  await assert.rejects(() => new CreateCustomer(new TestCustomerRepository()).execute({
    displayName: "  Marta Ruiz "
  } as any), /email/i);

  const customer = await new CreateCustomer(new TestCustomerRepository()).execute({
    displayName: "  Marta Ruiz ",
    email: " MARTA@EXAMPLE.COM ",
    taxId: " 1234a ",
    tags: [" Recurrente ", "recurrente", "Particular"]
  });

  assert.equal(customer.displayName, "Marta Ruiz");
  assert.equal(customer.email, "marta@example.com");
  assert.equal(customer.registrationStatus, "pending");
  assert.equal(customer.taxId, "1234A");
  assert.deepEqual(customer.tags, ["recurrente", "particular"]);
});

test("customer updates normalize contact data and tags", async () => {
  const customer = await new UpdateCustomer(new TestCustomerRepository()).execute("customer-1", {
    email: " MARTA@EXAMPLE.COM ",
    tags: ["VIP", " vip "]
  });

  assert.equal(customer?.email, "marta@example.com");
  assert.deepEqual(customer?.tags, ["vip"]);
});

test("customer creation normalizes structured contact and billing details", async () => {
  const customer = await new CreateCustomer(new TestCustomerRepository()).execute({
    displayName: "Ada Cliente",
    email: "ada@example.test",
    customerType: "business",
    addressStreet: "  Calle Uno 1 ",
    addressCity: " Madrid ",
    billingName: " Empresa Ada ",
    billingTaxId: " x1234 ",
    billingAddressStreet: " Avenida Dos 4 "
  });

  assert.equal(customer.addressStreet, "Calle Uno 1");
  assert.equal(customer.addressCity, "Madrid");
  assert.equal(customer.customerType, "business");
  assert.equal(customer.billingName, "Empresa Ada");
  assert.equal(customer.billingTaxId, "X1234");
  assert.equal(customer.billingAddressStreet, "Avenida Dos 4");
});