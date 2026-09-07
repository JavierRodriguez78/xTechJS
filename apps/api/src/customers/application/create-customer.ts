import { randomUUID } from "node:crypto";
import type { CreateCustomerInput, Customer } from "../domain/customer.js";
import type { CustomerRepository, NewCustomerRecord } from "./customer-repository.js";

export class CreateCustomer {
  constructor(private readonly customerRepository: CustomerRepository) {}

  execute(input: CreateCustomerInput): Promise<Customer> {
    const customer: NewCustomerRecord = {
      ...input,
      displayName: input.displayName.trim(),
      email: input.email?.trim().toLowerCase(),
      phone: input.phone?.trim(),
      address: input.address?.trim(),
      taxId: input.taxId?.trim().toUpperCase(),
      internalNotes: input.internalNotes?.trim(),
      tags: [...new Set(input.tags?.map((tag) => tag.trim().toLowerCase()).filter(Boolean) ?? [])],
      id: randomUUID()
    };
    return this.customerRepository.create(customer);
  }
}