import { Controller, Body, Param, Post, Req, Res } from "@xtaskjs/common";
import {ValidatedBody} from "@xtaskjs/validation";
import { registerAdminSchema, type RegisterAdminBody } from "../../domain/request/register-admin-request.js";
import type { User } from "../../../../../users/domain/user.js";
import type { CommandBus, QueryBus } from "@xtaskjs/cqrs";
import type { DataSource } from "typeorm";
import { InjectDataSource } from "@xtaskjs/typeorm";
import { InjectCommandBus, InjectQueryBus } from "@xtaskjs/cqrs";
import { BootstrapAdminCommand } from "../../../../../users/application/cqrs/user-messages.js";
import { RegisterAdminCommand } from "../../appication/cqrs/commands/register-admin-command.js";


   function toPublicUser(user: User): User {
      const { passwordHash: _, ...publicUser } = user as User & { passwordHash?: string };
      return publicUser;
    }

@Controller("/api/auth")
export class RegisterAdminController {

    constructor(
        @InjectCommandBus() private readonly commandBus: CommandBus,
        @InjectQueryBus() private readonly queryBus: QueryBus
    ) {}

    @Post("/register/admin")
    async registerAdmin(@ValidatedBody(registerAdminSchema) body: RegisterAdminBody, @Req() request: unknown, @Res() reply: { code(statusCode: number): { send(payload: unknown): unknown }}){
        
        try {
              return reply.code(201).send(toPublicUser(await this.commandBus.execute(new RegisterAdminCommand(body))));
            } catch (error) {
              return reply.code(409).send({ message: (error as Error).message });
            }
    }
}
