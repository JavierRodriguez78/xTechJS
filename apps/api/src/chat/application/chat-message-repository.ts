import type { ChatMessage, NewChatMessageInput } from "../domain/chat-message.js";

export interface NewChatMessageRecord extends NewChatMessageInput {
  id: string;
}

export interface ChatMessageRepository {
  create(input: NewChatMessageRecord): Promise<ChatMessage>;
  listByRepairOrder(repairOrderId: string): Promise<readonly ChatMessage[]>;
}
