import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { ChatMessage } from "../domain/chat-message.js";
import type { ChatMessageRepository } from "./chat-message-repository.js";

@Traceable("ListChatMessages")
@Service()
export class ListChatMessages {
  constructor(@Qualifier("chatMessageRepository") private readonly chatMessageRepository: ChatMessageRepository) {}

  execute(repairOrderId: string): Promise<readonly ChatMessage[]> {
    return this.chatMessageRepository.listByRepairOrder(repairOrderId);
  }
}
