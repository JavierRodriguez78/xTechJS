import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CustomerCommunication } from "../domain/customer-communication.js";
import type { CustomerCommunicationRepository } from "./customer-communication-repository.js";

@Traceable("ListCustomerCommunications")
@Service()
export class ListCustomerCommunications {
  constructor(@Qualifier("customerCommunicationRepository") private readonly repository: CustomerCommunicationRepository) {}

  async execute(customerId: string): Promise<readonly CustomerCommunication[]> {
    const communications = await this.repository.findByCustomerId(customerId);
    return [...communications].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}