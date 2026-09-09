import { UseGuards, type RouteExecutionContext } from "@xtaskjs/common";
import { ForbiddenError } from "@xtaskjs/core";
import { hasPermission, type Permission } from "../../domain/permission.js";
import type { AuthTokenPayload } from "./auth-routes.js";

export function PermissionRequired(permission: Permission): MethodDecorator & ClassDecorator {
  return UseGuards(({ auth }: RouteExecutionContext): true => {
    if (!auth.isAuthenticated) throw new ForbiddenError("Forbidden");
    const user = auth.user as AuthTokenPayload | undefined;
    if (!user || !hasPermission(user.role, permission)) throw new ForbiddenError("Forbidden");
    return true;
  });
}