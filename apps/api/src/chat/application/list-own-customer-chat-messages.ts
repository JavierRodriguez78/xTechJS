import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import type { RepairOrderRepository } from "../../repairs/application/repair-order-repository.js";
import type { ChatMessage } from "../domain/chat-message.js";
import { ListChatMessages } from "./list-chat-messages.js";

@Traceable("ListOwnCustomerChatMessages")
@Service()
export class ListOwnCustomerChatMessages {
  constructor(
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    private readonly listChatMessages: ListChatMessages
  ) {}

  async execute(repairOrderId: string, email: string): Promise<readonly ChatMessage[] | undefined> {
    const customer = await this.customerRepository.findByEmail(email);
    const repair = await this.repairOrderRepository.findById(repairOrderId);
    if (!customer || !repair || repair.customerId !== customer.id) return undefined;
    return this.listChatMessages.execute(repairOrderId);
  }
}
