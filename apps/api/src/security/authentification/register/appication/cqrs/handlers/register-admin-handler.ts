import { Service } from "@xtaskjs/core";
import type { ICommandHandler } from "@xtaskjs/cqrs";
import { CommandHandler } from "@xtaskjs/cqrs";
import type { User } from "../../../../../../users/domain/user.js";
import { RegisterAdminCommand } from "../commands/register-admin-command.js";
import type { AuthenticationService } from "../../../../../../users/application/authentication-service.js";
/*
@Service()
@CommandHandler(RegisterAdminCommand)
export class RegisterAdminHandler implements ICommandHandler<RegisterAdminCommand, User> {
  constructor(private readonly authenticationService: AuthenticationService) {}

  execute(command: RegisterAdminCommand): Promise<User> {
    new Promise((resolve, reject) => {
      resolve(this.authenticationService.bootstrapAdmin(command.input));
    });
  }
}
}*/
