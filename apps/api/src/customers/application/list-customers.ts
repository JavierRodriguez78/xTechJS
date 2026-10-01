import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CustomerListOptions, CustomerPage, CustomerRepository } from "./customer-repository.js";

@Traceable("ListCustomers")
@Service()
export class ListCustomers {
  constructor(@Qualifier("customerRepository") private readonly customerRepository: CustomerRepository) {}

  execute(options: CustomerListOptions): Promise<CustomerPage> {
    return this.customerRepository.findPage(options);
  }
}