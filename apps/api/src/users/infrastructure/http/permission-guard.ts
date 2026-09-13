import { UseGuards, type RouteExecutionContext } from "@xtaskjs/common";
import { ForbiddenError } from "@xtaskjs/core";
import { hasPermission, type Permission } from "../../domain/permission.js";

export function PermissionRequired(permission: Permission): MethodDecorator & ClassDecorator {
  return UseGuards(({ auth }: RouteExecutionContext): true => {
    if (!auth.isAuthenticated) throw new ForbiddenError("Forbidden");
    const roles = auth.roles.length > 0
      ? auth.roles
      : typeof auth.claims?.role === "string"
        ? [auth.claims.role]
        : [];
    if (!roles.some((role) => hasPermission(role as Parameters<typeof hasPermission>[0], permission))) {
      throw new ForbiddenError("Forbidden");
    }
    return true;
  });
}