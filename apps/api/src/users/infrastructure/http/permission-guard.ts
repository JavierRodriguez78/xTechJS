import { UseGuards, type RouteExecutionContext } from "@xtaskjs/common";
import { ForbiddenError } from "@xtaskjs/core";
import { authenticationGuard } from "@xtaskjs/security";
import { hasPermission, type Permission } from "../../domain/permission.js";

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
    if (!roles.some((role) => hasPermission(role as Parameters<typeof hasPermission>[0], permission))) {
      throw new ForbiddenError("Forbidden");
    }
    return true;
  });
}