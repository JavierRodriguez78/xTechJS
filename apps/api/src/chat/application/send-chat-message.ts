import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { InjectSocketService, type SocketIoService } from "@xtaskjs/socket-io";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { ChatMessage, NewChatMessageInput } from "../domain/chat-message.js";
import type { ChatMessageRepository } from "./chat-message-repository.js";
import type { RepairOrderRepository } from "../../repairs/application/repair-order-repository.js";
import { chatRoomName, customerNotificationRoom, staffNotificationRoom } from "../infrastructure/socket/chat-room.js";

@Traceable("SendChatMessage")
@Service()
export class SendChatMessage {
  constructor(
    @Qualifier("chatMessageRepository") private readonly chatMessageRepository: ChatMessageRepository,
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    @InjectSocketService() private readonly sockets: SocketIoService
  ) {}

  async execute(input: NewChatMessageInput): Promise<ChatMessage | undefined> {
    const repair = await this.repairOrderRepository.findById(input.repairOrderId);
    if (!repair) return undefined;
    const body = input.body.trim();
    if (!body) return undefined;
    const message = await this.chatMessageRepository.create({ ...input, id: randomUUID(), body });
    this.sockets.emit("chat.message", message, { namespace: "/chat", room: chatRoomName(message.repairOrderId) });
    // Lightweight notification to rooms beyond the repair's own chat, so staff/customers are
    // notified of new messages even while viewing a different repair or screen.
    this.sockets.emit(
      "chat.notification",
      { repairOrderId: message.repairOrderId, senderId: message.senderId, senderName: message.senderName, senderRole: message.senderRole, preview: message.body.slice(0, 140), createdAt: message.createdAt },
      { namespace: "/chat", room: [staffNotificationRoom(), customerNotificationRoom(repair.customerId)] }
    );
    return message;
  }
}

