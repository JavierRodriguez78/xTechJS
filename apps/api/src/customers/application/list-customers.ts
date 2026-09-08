import { Qualifier, Service } from "@xtaskjs/core";
import type { Customer } from "../domain/customer.js";
import type { CustomerRepository } from "./customer-repository.js";

@Service()
export class ListCustomers {
  constructor(@Qualifier("customerRepository") private readonly customerRepository: CustomerRepository) {}

  execute(): Promise<readonly Customer[]> {
    return this.customerRepository.findAll();
  }
}