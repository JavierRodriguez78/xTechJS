import type { FastifyInstance, FastifyRequest } from "fastify";
import type { DataSource } from "typeorm";
import type { CommandBus, QueryBus } from "@xtaskjs/cqrs";
import { Controller, Body, Param, Post, Req, Res, UseGuards } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus } from "@xtaskjs/cqrs";
import { InjectDataSource } from "@xtaskjs/typeorm";
import { isStaffRole, type UserRole } from "../../../shared/domain/user-role.js";
import type { AuthenticationService } from "../../application/authentication-service.js";
import { AuthenticateUserCommand, BootstrapAdminCommand, FindActiveNonAdminUserQuery } from "../../application/cqrs/user-messages.js";
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

export function requireControllerPermission(permission: Permission) {
  return async ({ request }: { request?: FastifyRequest }): Promise<boolean> => {
    if (!request) return false;
    await request.jwtVerify();
    return hasPermission(request.user.role, permission);
  };
}

function toPublicUser(user: User): User {
  const { passwordHash: _, ...publicUser } = user as User & { passwordHash?: string };
  return publicUser;
}

@Controller("/api/auth")
export class AuthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectCommandBus() private readonly commandBus: CommandBus,
    @InjectQueryBus() private readonly queryBus: QueryBus
  ) {}

  @Post("/bootstrap")
  async bootstrap(@Body() input: { email: string; displayName: string; password: string }, @Res() reply: { code(statusCode: number): { send(payload: unknown): unknown } }): Promise<unknown> {
    if (!input?.email || !input.displayName || !input.password || input.password.length < 12) {
      return reply.code(400).send({ message: "Email, display name and a password of at least 12 characters are required" });
    }
    try {
      return reply.code(201).send(toPublicUser(await this.commandBus.execute(new BootstrapAdminCommand(input))));
    } catch (error) {
      return reply.code(409).send({ message: (error as Error).message });
    }
  }

  @Post("/login")
  async login(@Body() input: { email: string; password: string }, @Req() request: FastifyRequest, @Res() reply: { code(statusCode: number): { send(payload: unknown): unknown } }): Promise<unknown> {
    const user = await this.commandBus.execute(new AuthenticateUserCommand(input?.email ?? "", input?.password ?? ""));
    if (!user) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }
    const token = request.server.jwt.sign({ sub: user.id, role: user.role });
    return { accessToken: token, user: toPublicUser(user) };
  }

  @Post("/staff/login")
  async staffLogin(@Body() input: { email: string; password: string }, @Req() request: FastifyRequest, @Res() reply: { code(statusCode: number): { send(payload: unknown): unknown } }): Promise<unknown> {
    const user = await this.commandBus.execute(new AuthenticateUserCommand(input?.email ?? "", input?.password ?? ""));
    if (!user || !isStaffRole(user.role)) {
      return reply.code(401).send({ message: "Invalid staff credentials" });
    }
    const token = request.server.jwt.sign({ sub: user.id, role: user.role });
    return { accessToken: token, user: toPublicUser(user) };
  }

  @Post("/impersonate/:userId")
  @UseGuards(requireControllerPermission(PERMISSIONS.impersonationUse))
  async impersonate(@Param("userId") targetId: string, @Req() request: FastifyRequest, @Res() reply: { code(statusCode: number): { send(payload: unknown): unknown } }): Promise<unknown> {
    const target = await this.queryBus.execute(new FindActiveNonAdminUserQuery(targetId));
    if (!target) {
      return reply.code(404).send({ message: "Active technician or customer not found" });
    }

    await recordImpersonation(this.dataSource, request.user.sub, target.id);
    const accessToken = request.server.jwt.sign({ sub: target.id, role: target.role, impersonatorId: request.user.sub });
    return { accessToken, user: toPublicUser(target), impersonatedBy: request.user.sub };
  }
}