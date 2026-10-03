import { UseGuards, type RouteExecutionContext } from "@xtaskjs/common";
import { ForbiddenError } from "@xtaskjs/core";
import { authenticationGuard } from "@xtaskjs/security";
import { hasPermission, type Permission } from "../../domain/permission.js";
import { isGlobalAdministrator } from "../../domain/store-access.js";

export function PermissionRequired(permission: Permission): MethodDecorator & ClassDecorator {
  return UseGuards(async (context: RouteExecutionContext): Promise<true> => {
    if (!context.auth.isAuthenticated) {
      if (typeof authenticationGuard === "function") await authenticationGuard(context);
      else await authenticationGuard.canActivate(context);
    }

    const { auth } = context;
    const roles = [...new Set([
      ...auth.roles,
      ...(typeof auth.claims?.role === "string" ? [auth.claims.role] : [])
    ])];
    const claims = auth.claims as Record<string, unknown> | undefined;
    const scopedAdmin = roles.includes("admin") && (Array.isArray(claims?.storeAccess) || (claims?.storeAccess === undefined && typeof claims?.storeId === "string"));
    if (scopedAdmin && (permission === "ecommerce:manage" || permission === "tradein:manage")) throw new ForbiddenError("Global administrator access required");
    if (!roles.some((role) => hasPermission(role as Parameters<typeof hasPermission>[0], permission))) {
      throw new ForbiddenError("Forbidden");
    }
    return true;
  });
}

export function GlobalPermissionRequired(permission: Permission): MethodDecorator & ClassDecorator {
  return UseGuards(async (context: RouteExecutionContext): Promise<true> => {
    if (!context.auth.isAuthenticated) {
      if (typeof authenticationGuard === "function") await authenticationGuard(context);
      else await authenticationGuard.canActivate(context);
    }
    const { auth } = context;
    const roles = [...new Set([...auth.roles, ...(typeof auth.claims?.role === "string" ? [auth.claims.role] : [])])];
    if (!roles.some((role) => hasPermission(role as Parameters<typeof hasPermission>[0], permission))) throw new ForbiddenError("Forbidden");
    const claims = auth.claims as { storeId?: string | null; defaultStoreId?: string | null; storeAccess?: string[] | null } | undefined;
    if (roles.includes("admin") && isGlobalAdministrator({ role: "admin", defaultStoreId: claims?.defaultStoreId, storeId: claims?.storeId, storeAccess: claims?.storeAccess })) return true;
    throw new ForbiddenError("Global administrator access required");
  });
}