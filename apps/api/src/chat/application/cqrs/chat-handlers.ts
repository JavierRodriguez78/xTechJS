import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { ChatMessage } from "../../domain/chat-message.js";
import { SendChatMessage } from "../send-chat-message.js";
import { SendOwnCustomerChatMessage } from "../send-own-customer-chat-message.js";
import { ListChatMessages } from "../list-chat-messages.js";
import { ListOwnCustomerChatMessages } from "../list-own-customer-chat-messages.js";
import { ListChatMessagesQuery, ListOwnCustomerChatMessagesQuery, SendChatMessageCommand, SendOwnCustomerChatMessageCommand } from "./chat-messages.js";

@Service()
@CommandHandler(SendChatMessageCommand)
export class SendChatMessageHandler implements ICommandHandler<SendChatMessageCommand, ChatMessage | undefined> {
  constructor(private readonly useCase: SendChatMessage) {}

  execute(command: SendChatMessageCommand): Promise<ChatMessage | undefined> {
    return this.useCase.execute({ repairOrderId: command.repairOrderId, senderId: command.senderId, senderRole: command.senderRole, senderName: command.senderName, body: command.body });
  }
}

@Service()
@CommandHandler(SendOwnCustomerChatMessageCommand)
export class SendOwnCustomerChatMessageHandler implements ICommandHandler<SendOwnCustomerChatMessageCommand, ChatMessage | undefined> {
  constructor(private readonly useCase: SendOwnCustomerChatMessage) {}

  execute(command: SendOwnCustomerChatMessageCommand): Promise<ChatMessage | undefined> {
    return this.useCase.execute(command.repairOrderId, command.email, command.body);
  }
}

@Service()
@QueryHandler(ListChatMessagesQuery)
export class ListChatMessagesHandler implements IQueryHandler<ListChatMessagesQuery, readonly ChatMessage[]> {
  constructor(private readonly useCase: ListChatMessages) {}

  execute(query: ListChatMessagesQuery): Promise<readonly ChatMessage[]> {
    return this.useCase.execute(query.repairOrderId);
  }
}

@Service()
@QueryHandler(ListOwnCustomerChatMessagesQuery)
export class ListOwnCustomerChatMessagesHandler implements IQueryHandler<ListOwnCustomerChatMessagesQuery, readonly ChatMessage[] | undefined> {
  constructor(private readonly useCase: ListOwnCustomerChatMessages) {}

  execute(query: ListOwnCustomerChatMessagesQuery): Promise<readonly ChatMessage[] | undefined> {
    return this.useCase.execute(query.repairOrderId, query.email);
  }
}
