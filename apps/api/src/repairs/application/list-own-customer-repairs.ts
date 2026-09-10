import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import type { RepairOrder } from "../domain/repair-order.js";
import { ListCustomerRepairs } from "./list-customer-repairs.js";

@Traceable("ListOwnCustomerRepairs")
@Service()
export class ListOwnCustomerRepairs {
  constructor(
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    private readonly listCustomerRepairs: ListCustomerRepairs
  ) {}

  async execute(email: string): Promise<readonly RepairOrder[]> {
    const customer = await this.customerRepository.findByEmail(email);
    return customer ? this.listCustomerRepairs.execute(customer.id) : [];
  }
}