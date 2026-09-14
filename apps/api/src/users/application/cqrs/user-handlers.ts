import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { User, UserCredentials } from "../../domain/user.js";
import { AuthenticationService } from "../authentication-service.js";
import { ManageUser } from "../manage-user.js";
import { ListTechnicians } from "../list-technicians.js";
import { ListUsers } from "../list-users.js";
import { AuthenticateUserCommand, BootstrapAdminCommand, CreateUserCommand, FindActiveNonAdminUserQuery, ListTechniciansQuery, ListUsersQuery, UpdateUserCommand } from "./user-messages.js";

@Service()
@CommandHandler(BootstrapAdminCommand)
export class BootstrapAdminHandler implements ICommandHandler<BootstrapAdminCommand, User> {
  constructor(private readonly authenticationService: AuthenticationService) {}

  execute(command: BootstrapAdminCommand): Promise<User> {
    return this.authenticationService.bootstrapAdmin(command.input);
  }
}

@Service()
@CommandHandler(AuthenticateUserCommand)
export class AuthenticateUserHandler implements ICommandHandler<AuthenticateUserCommand, UserCredentials | undefined> {
  constructor(private readonly authenticationService: AuthenticationService) {}

  execute(command: AuthenticateUserCommand): Promise<UserCredentials | undefined> {
    return this.authenticationService.authenticate(command.email, command.password);
  }
}

@Service()
@QueryHandler(ListUsersQuery)
export class ListUsersHandler implements IQueryHandler<ListUsersQuery, readonly User[]> {
  constructor(private readonly listUsers: ListUsers) {}

  execute(): Promise<readonly User[]> {
    return this.listUsers.execute();
  }
}

@Service()
@QueryHandler(ListTechniciansQuery)
export class ListTechniciansHandler implements IQueryHandler<ListTechniciansQuery, readonly User[]> {
  constructor(private readonly listTechnicians: ListTechnicians) {}

  execute(): Promise<readonly User[]> {
    return this.listTechnicians.execute();
  }
}

@Service()
@QueryHandler(FindActiveNonAdminUserQuery)
export class FindActiveNonAdminUserHandler implements IQueryHandler<FindActiveNonAdminUserQuery, User | undefined> {
  constructor(private readonly authenticationService: AuthenticationService) {}

  execute(query: FindActiveNonAdminUserQuery): Promise<User | undefined> {
    return this.authenticationService.findActiveNonAdminUser(query.id);
  }
}

@Service()
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, User> {
  constructor(private readonly manageUser: ManageUser) {}
  execute(command: CreateUserCommand): Promise<User> { return this.manageUser.create(command.input); }
}

@Service()
@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, User | undefined> {
  constructor(private readonly manageUser: ManageUser) {}
  execute(command: UpdateUserCommand): Promise<User | undefined> { return this.manageUser.update(command.id, command.input); }
}