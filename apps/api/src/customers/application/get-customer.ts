import type { Customer } from "../domain/customer.js";
import type { CustomerRepository } from "./customer-repository.js";

export class GetCustomer {
  constructor(private readonly customerRepository: CustomerRepository) {}

  execute(id: string): Promise<Customer | undefined> {
    return this.customerRepository.findById(id);
  }
}