import { EntitySchema } from "typeorm";
import type { ChatMessage } from "../../domain/chat-message.js";

export const ChatMessageEntitySchema = new EntitySchema<ChatMessage>({
  name: "ChatMessage",
  tableName: "chat_messages",
  columns: {
    id: { type: "uuid", primary: true },
    repairOrderId: { type: "uuid", name: "repair_order_id" },
    senderId: { type: "uuid", name: "sender_id" },
    senderRole: { type: String, name: "sender_role" },
    senderName: { type: String, name: "sender_name" },
    body: { type: "text" },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true }
  }
});
