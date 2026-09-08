import { Qualifier, Service } from "@xtaskjs/core";
import type { Customer, UpdateCustomerInput } from "../domain/customer.js";
import type { CustomerRepository } from "./customer-repository.js";

@Service()
export class UpdateCustomer {
  constructor(@Qualifier("customerRepository") private readonly customerRepository: CustomerRepository) {}

  execute(id: string, input: UpdateCustomerInput): Promise<Customer | undefined> {
    return this.customerRepository.update(id, {
      displayName: input.displayName?.trim(),
      email: input.email?.trim().toLowerCase(),
      phone: input.phone?.trim(),
      address: input.address?.trim(),
      taxId: input.taxId?.trim().toUpperCase(),
      internalNotes: input.internalNotes?.trim(),
      tags: input.tags ? [...new Set(input.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))] : undefined
    });
  }
}