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

export type UserUpdate = Partial<Pick<User,
  "email" | "displayName" | "role" | "storeId" | "defaultStoreId" | "storeAccess" | "active" |
  "phone" | "nationalId" | "addressStreet" | "addressPostalCode" | "addressCity" | "addressProvince" |
  "addressCountry" | "hiredAt" | "deactivatedAt"
>> & { passwordHash?: string };

export interface UserRepository {
  findAll(): Promise<readonly User[]>;
  findById(id: string): Promise<User | undefined>;
  findActiveByRole(role: UserRole): Promise<readonly User[]>;
  findByEmail(email: string): Promise<UserCredentials | undefined>;
  count(): Promise<number>;
  create(user: UserCredentials): Promise<User>;
  update(id: string, input: UserUpdate): Promise<User | undefined>;
  recordAuditLog(actorId: string, targetId: string, action: string): Promise<void>;
  findNationalId(id: string): Promise<string | null | undefined>;
  listAuditLogs(): Promise<readonly AuditLogEntry[]>;
}