import assert from "node:assert/strict";
import test from "node:test";
import { ListCustomers } from "./list-customers.js";
import type { CustomerListOptions, CustomerRepository } from "./customer-repository.js";

test("customer listing delegates server pagination, filters and sorting to its repository", async () => {
  let received: CustomerListOptions | undefined;
  const repository = {
    async findPage(options: CustomerListOptions) {
      received = options;
      return { items: [], total: 42, page: options.page, pageSize: options.pageSize };
    }
  } as unknown as CustomerRepository;
  const options: CustomerListOptions = { query: "ana", registrationStatus: "pending", tag: "empresa", createdFrom: new Date("2026-01-01"), createdTo: new Date("2026-02-01"), sort: "displayName:asc", page: 2, pageSize: 25 };

  const page = await new ListCustomers(repository).execute(options);

  assert.equal(page.total, 42);
  assert.deepEqual(received, options);
});