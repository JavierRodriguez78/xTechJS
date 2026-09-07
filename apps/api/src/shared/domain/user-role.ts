export const USER_ROLES = ["admin", "technician", "customer"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const STAFF_ROLES = ["admin", "technician"] as const;

export function isStaffRole(role: UserRole): role is (typeof STAFF_ROLES)[number] {
	return STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
}