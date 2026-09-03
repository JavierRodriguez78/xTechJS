export const USER_ROLES = ["admin", "technician", "customer"] as const;

export type UserRole = (typeof USER_ROLES)[number];