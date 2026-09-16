import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { ChatMessageRepository, NewChatMessageRecord } from "../../application/chat-message-repository.js";
import type { ChatMessage } from "../../domain/chat-message.js";
import { ChatMessageEntitySchema } from "./chat-message-entity.js";

@Traceable("PostgresChatMessageRepository")
@Service({ name: "chatMessageRepository" })
export class PostgresChatMessageRepository implements ChatMessageRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  create(input: NewChatMessageRecord): Promise<ChatMessage> {
    return this.dataSource.getRepository(ChatMessageEntitySchema).save(input);
  }

  listByRepairOrder(repairOrderId: string): Promise<readonly ChatMessage[]> {
    return this.dataSource.getRepository(ChatMessageEntitySchema).find({ where: { repairOrderId }, order: { createdAt: "ASC" } });
  }
}
