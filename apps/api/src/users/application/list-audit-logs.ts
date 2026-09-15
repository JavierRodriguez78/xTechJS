import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { AuditLogEntry, UserRepository } from "./user-repository.js";

@Traceable("ListAuditLogs")
@Service()
export class ListAuditLogs {
  constructor(@Qualifier("userRepository") private readonly userRepository: UserRepository) {}

  execute(): Promise<readonly AuditLogEntry[]> {
    return this.userRepository.listAuditLogs();
  }
}
