import type { ChatSenderRole } from "../../domain/chat-message.js";

export class SendChatMessageCommand {
  constructor(public readonly repairOrderId: string, public readonly senderId: string, public readonly senderRole: ChatSenderRole, public readonly senderName: string, public readonly body: string) {}
}

export class SendOwnCustomerChatMessageCommand {
  constructor(public readonly repairOrderId: string, public readonly email: string, public readonly body: string) {}
}

export class ListChatMessagesQuery {
  constructor(public readonly repairOrderId: string) {}
}

export class ListOwnCustomerChatMessagesQuery {
  constructor(public readonly repairOrderId: string, public readonly email: string) {}
}
