export interface StoreAccessClaims {
  role: string;
  storeId?: string | null;
  defaultStoreId?: string | null;
  storeAccess?: string[] | null;
}

export function getStoreAccess(user: StoreAccessClaims): string[] | null {
  if (Array.isArray(user.storeAccess)) return [...new Set(user.storeAccess)];
  if (user.storeAccess === null) return user.role === "admin" ? null : [];
  const defaultStoreId = user.defaultStoreId ?? user.storeId ?? null;
  if (user.role === "admin" && defaultStoreId === null) return null;
  return defaultStoreId ? [defaultStoreId] : [];
}

export function canAccessStore(user: StoreAccessClaims, storeId: string): boolean {
  const stores = getStoreAccess(user);
  return stores === null || stores.includes(storeId);
}

export function isGlobalAdministrator(user: StoreAccessClaims): boolean {
  if (user.role !== "admin") return false;
  if (user.storeAccess !== undefined) return user.storeAccess === null;
  return (user.defaultStoreId ?? user.storeId ?? null) === null;
}

export function toStoreAccessClaims(user: StoreAccessClaims): { defaultStoreId: string | null; storeAccess: string[] | null; storeId: string | null } {
  const defaultStoreId = user.defaultStoreId ?? user.storeId ?? null;
  const storeAccess = user.storeAccess !== undefined
    ? user.storeAccess
    : user.role === "admin" && defaultStoreId === null ? null : defaultStoreId ? [defaultStoreId] : [];
  return { defaultStoreId, storeAccess, storeId: defaultStoreId };
}