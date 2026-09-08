import { Qualifier, Service } from "@xtaskjs/core";
import type { Customer } from "../domain/customer.js";
import type { CustomerRepository } from "./customer-repository.js";

@Service()
export class GetCustomer {
  constructor(@Qualifier("customerRepository") private readonly customerRepository: CustomerRepository) {}

  execute(id: string): Promise<Customer | undefined> {
    return this.customerRepository.findById(id);
  }
}