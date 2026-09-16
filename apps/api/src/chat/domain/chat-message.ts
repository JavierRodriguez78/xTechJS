export type ChatSenderRole = "admin" | "technician" | "customer";

export interface ChatMessage {
  id: string;
  repairOrderId: string;
  senderId: string;
  senderRole: ChatSenderRole;
  senderName: string;
  body: string;
  createdAt: Date;
}

export interface NewChatMessageInput {
  repairOrderId: string;
  senderId: string;
  senderRole: ChatSenderRole;
  senderName: string;
  body: string;
}
