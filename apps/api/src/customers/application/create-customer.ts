import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CreateCustomerInput, Customer } from "../domain/customer.js";
import type { CustomerRepository, NewCustomerRecord } from "./customer-repository.js";
import { SendCustomerRegistrationEmail } from "./send-customer-registration-email.js";

@Traceable("CreateCustomer")
@Service()
export class CreateCustomer {
  constructor(
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    private readonly sendCustomerRegistrationEmail?: SendCustomerRegistrationEmail
  ) {}

  async execute(input: CreateCustomerInput): Promise<Customer> {
    if (!input.email || !input.email.trim()) {
      throw new Error("Customer email is required");
    }

    const customer: NewCustomerRecord = {
      ...input,
      displayName: input.displayName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim(),
      address: input.address?.trim(),
      taxId: input.taxId?.trim().toUpperCase(),
      internalNotes: input.internalNotes?.trim(),
      registrationStatus: "pending",
      tags: [...new Set(input.tags?.map((tag) => tag.trim().toLowerCase()).filter(Boolean) ?? [])],
      id: randomUUID()
    };

    const created = await this.customerRepository.create(customer);
    if (this.sendCustomerRegistrationEmail) {
      await this.sendCustomerRegistrationEmail.execute(created);
    }
    return created;
  }
}