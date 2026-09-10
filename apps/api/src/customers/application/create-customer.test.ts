import assert from "node:assert/strict";
import test from "node:test";
import type { CreateCustomerInput, Customer, UpdateCustomerInput } from "../domain/customer.js";
import type { CustomerRepository, NewCustomerRecord } from "./customer-repository.js";
import { CreateCustomer } from "./create-customer.js";
import { UpdateCustomer } from "./update-customer.js";

class TestCustomerRepository implements CustomerRepository {
  async create(input: NewCustomerRecord): Promise<Customer> {
    return {
      id: "customer-1",
      displayName: input.displayName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      taxId: input.taxId ?? null,
      internalNotes: input.internalNotes ?? null,
      tags: input.tags ?? [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async findAll(): Promise<readonly Customer[]> {
    return [];
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
      address: input.address ?? null,
      taxId: input.taxId ?? null,
      internalNotes: input.internalNotes ?? null,
      tags: input.tags ?? [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}

test("customer creation normalizes identity fields and tags", async () => {
  const customer = await new CreateCustomer(new TestCustomerRepository()).execute({
    displayName: "  Marta Ruiz ",
    email: " MARTA@EXAMPLE.COM ",
    taxId: " 1234a ",
    tags: [" Recurrente ", "recurrente", "Particular"]
  });

  assert.equal(customer.displayName, "Marta Ruiz");
  assert.equal(customer.email, "marta@example.com");
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