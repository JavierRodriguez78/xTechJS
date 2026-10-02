import type { UserRole } from "../../shared/domain/user-role.js";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  storeId: string | null;
  active: boolean;
}

export interface UserCredentials extends User {
  passwordHash: string;
}