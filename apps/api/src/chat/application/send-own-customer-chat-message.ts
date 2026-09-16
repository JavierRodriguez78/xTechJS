import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import type { RepairOrderRepository } from "../../repairs/application/repair-order-repository.js";
import type { ChatMessage } from "../domain/chat-message.js";
import { SendChatMessage } from "./send-chat-message.js";

@Traceable("SendOwnCustomerChatMessage")
@Service()
export class SendOwnCustomerChatMessage {
  constructor(
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    private readonly sendChatMessage: SendChatMessage
  ) {}

  async execute(repairOrderId: string, email: string, body: string): Promise<ChatMessage | undefined> {
    const customer = await this.customerRepository.findByEmail(email);
    const repair = await this.repairOrderRepository.findById(repairOrderId);
    if (!customer || !repair || repair.customerId !== customer.id) return undefined;
    return this.sendChatMessage.execute({ repairOrderId, senderId: customer.id, senderRole: "customer", senderName: customer.displayName, body });
  }
}
