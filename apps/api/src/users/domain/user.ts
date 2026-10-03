import type { UserRole } from "../../shared/domain/user-role.js";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  defaultStoreId?: string | null;
  storeAccess?: string[] | null;
  storeId?: string | null;
  active: boolean;
  phone?: string | null;
  nationalId?: string | null;
  addressStreet?: string | null;
  addressPostalCode?: string | null;
  addressCity?: string | null;
  addressProvince?: string | null;
  addressCountry?: string | null;
  hiredAt?: Date | null;
  deactivatedAt?: Date | null;
}

export interface UserCredentials extends User {
  passwordHash: string;
}