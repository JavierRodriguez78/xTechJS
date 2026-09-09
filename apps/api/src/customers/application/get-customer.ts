import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Customer } from "../domain/customer.js";
import type { CustomerRepository } from "./customer-repository.js";

@Traceable("GetCustomer")
@Service()
export class GetCustomer {
  constructor(@Qualifier("customerRepository") private readonly customerRepository: CustomerRepository) {}

  execute(id: string): Promise<Customer | undefined> {
    return this.customerRepository.findById(id);
  }
}