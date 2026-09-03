import type { UserRole } from "../../shared/domain/user-role.js";

export const PERMISSIONS = {
  usersManage: "users:manage",
  customersRead: "customers:read",
  customersManage: "customers:manage",
  repairsRead: "repairs:read",
  repairsManage: "repairs:manage",
  inventoryManage: "inventory:manage",
  paymentsManage: "payments:manage",
  chatUse: "chat:use",
  impersonationUse: "impersonation:use"
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const allPermissions = Object.values(PERMISSIONS);

const permissionsByRole: Record<UserRole, readonly Permission[]> = {
  admin: allPermissions,
  technician: [PERMISSIONS.customersRead, PERMISSIONS.repairsRead, PERMISSIONS.repairsManage, PERMISSIONS.chatUse],
  customer: [PERMISSIONS.repairsRead, PERMISSIONS.chatUse]
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return permissionsByRole[role].includes(permission);
}