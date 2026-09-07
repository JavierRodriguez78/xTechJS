import type { FastifyInstance, FastifyRequest } from "fastify";
import type { DataSource } from "typeorm";
import type { UserRole } from "../../../shared/domain/user-role.js";
import type { AuthenticationService } from "../../application/authentication-service.js";
import { hasPermission, PERMISSIONS, type Permission } from "../../domain/permission.js";
import type { User } from "../../domain/user.js";
import { recordImpersonation } from "../persistence/audit-log.js";

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
  impersonatorId?: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: AuthTokenPayload;
  }
}

export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest): Promise<void> => {
    await request.jwtVerify();
    if (!hasPermission(request.user.role, permission)) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    }
  };
}

function toPublicUser(user: User): User {
  const { passwordHash: _, ...publicUser } = user as User & { passwordHash?: string };
  return publicUser;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  authenticationService: AuthenticationService,
  dataSource: DataSource
): void {
  app.post("/api/auth/bootstrap", async (request, reply) => {
    const input = request.body as { email: string; displayName: string; password: string };
    if (!input?.email || !input.displayName || !input.password || input.password.length < 12) {
      return reply.code(400).send({ message: "Email, display name and a password of at least 12 characters are required" });
    }
    try {
      return reply.code(201).send(toPublicUser(await authenticationService.bootstrapAdmin(input)));
    } catch (error) {
      return reply.code(409).send({ message: (error as Error).message });
    }
  });

  app.post("/api/auth/login", async (request, reply) => {
    const input = request.body as { email: string; password: string };
    const user = await authenticationService.authenticate(input?.email ?? "", input?.password ?? "");
    if (!user) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }
    const token = await reply.jwtSign({ sub: user.id, role: user.role });
    return { accessToken: token, user: toPublicUser(user) };
  });

  app.post("/api/auth/impersonate/:userId", { preHandler: requirePermission(PERMISSIONS.impersonationUse) }, async (request, reply) => {
    const targetId = (request.params as { userId: string }).userId;
    const target = await authenticationService.findActiveNonAdminUser(targetId);
    if (!target) {
      return reply.code(404).send({ message: "Active technician or customer not found" });
    }

    await recordImpersonation(dataSource, request.user.sub, target.id);
    const accessToken = await reply.jwtSign({ sub: target.id, role: target.role, impersonatorId: request.user.sub });
    return { accessToken, user: toPublicUser(target), impersonatedBy: request.user.sub };
  });
}