import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Customer } from "../domain/customer.js";
import type { CustomerRepository } from "./customer-repository.js";

@Traceable("ListCustomers")
@Service()
export class ListCustomers {
  constructor(@Qualifier("customerRepository") private readonly customerRepository: CustomerRepository) {}

  execute(): Promise<readonly Customer[]> {
    return this.customerRepository.findAll();
  }
}