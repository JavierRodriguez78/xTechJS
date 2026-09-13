import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Customer } from "../domain/customer.js";
import type { CustomerRepository } from "./customer-repository.js";
import { SendCustomerRegistrationEmail } from "./send-customer-registration-email.js";

@Traceable("ResendCustomerInvitation")
@Service()
export class ResendCustomerInvitation {
  constructor(
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    private readonly sendCustomerRegistrationEmail: SendCustomerRegistrationEmail
  ) {}

  async execute(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error("Customer not found");
    }
    if (!customer.email) {
      throw new Error("Customer email is required to resend the invitation");
    }
    await this.sendCustomerRegistrationEmail.execute(customer);
    return customer;
  }
}
