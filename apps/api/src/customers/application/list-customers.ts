import type { Customer } from "../domain/customer.js";
import type { CustomerRepository } from "./customer-repository.js";

export class ListCustomers {
  constructor(private readonly customerRepository: CustomerRepository) {}

  execute(): Promise<readonly Customer[]> {
    return this.customerRepository.findAll();
  }
}