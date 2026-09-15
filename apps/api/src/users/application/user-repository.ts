import type { UserRole } from "../../shared/domain/user-role.js";
import type { User, UserCredentials } from "../domain/user.js";

export interface AuditLogEntry {
  id: string;
  action: string;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
  targetName: string | null;
  targetEmail: string | null;
}

export interface UserRepository {
  findAll(): Promise<readonly User[]>;
  findById(id: string): Promise<User | undefined>;
  findActiveByRole(role: UserRole): Promise<readonly User[]>;
  findByEmail(email: string): Promise<UserCredentials | undefined>;
  count(): Promise<number>;
  create(user: UserCredentials): Promise<User>;
  update(id: string, input: Partial<Pick<User, "email" | "displayName" | "role" | "active">> & { passwordHash?: string }): Promise<User | undefined>;
  listAuditLogs(): Promise<readonly AuditLogEntry[]>;
}