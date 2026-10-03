import { Qualifier, Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { User, UserCredentials } from "../../domain/user.js";
import type { AuditLogEntry, UserRepository } from "../user-repository.js";
import { AuthenticationService } from "../authentication-service.js";
import { ListAuditLogs } from "../list-audit-logs.js";
import { ManageUser } from "../manage-user.js";
import { ListTechnicians } from "../list-technicians.js";
import { ListUsers } from "../list-users.js";
import {
  AuthenticateUserCommand,
  BootstrapAdminCommand,
  CreateEmployeeCommand,
  CreateUserCommand,
  FindActiveNonAdminUserQuery,
  FindUserByIdQuery,
  FindOwnStaffProfileQuery,
  ListAuditLogsQuery,
  ListTechniciansQuery,
  ListUsersQuery,
  UpdateUserCommand,
  UpdateEmployeeCommand,
  UpdateOwnStaffCredentialsCommand
} from "./user-messages.js";

@Service()
@QueryHandler(FindOwnStaffProfileQuery)
export class FindOwnStaffProfileHandler implements IQueryHandler<FindOwnStaffProfileQuery, User | undefined> {
  constructor(private readonly authenticationService: AuthenticationService) {}

  execute(query: FindOwnStaffProfileQuery): Promise<User | undefined> {
    return this.authenticationService.findOwnStaffProfile(query.id);
  }
}

@Service()
@CommandHandler(UpdateOwnStaffCredentialsCommand)
export class UpdateOwnStaffCredentialsHandler implements ICommandHandler<UpdateOwnStaffCredentialsCommand, User> {
  constructor(private readonly authenticationService: AuthenticationService) {}

  execute(command: UpdateOwnStaffCredentialsCommand): Promise<User> {
    return this.authenticationService.updateOwnCredentials(command.id, command.input);
  }
}

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
@QueryHandler(ListAuditLogsQuery)
export class ListAuditLogsHandler implements IQueryHandler<ListAuditLogsQuery, readonly AuditLogEntry[]> {
  constructor(private readonly listAuditLogs: ListAuditLogs) {}

  execute(): Promise<readonly AuditLogEntry[]> {
    return this.listAuditLogs.execute();
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
@QueryHandler(FindUserByIdQuery)
export class FindUserByIdHandler implements IQueryHandler<FindUserByIdQuery, User | undefined> {
  constructor(@Qualifier("userRepository") private readonly repository: UserRepository) {}

  execute(query: FindUserByIdQuery): Promise<User | undefined> {
    return this.repository.findById(query.id);
  }
}

@Service()
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, User> {
  constructor(private readonly manageUser: ManageUser) {}

  execute(command: CreateUserCommand): Promise<User> {
    return this.manageUser.create(command.input, command.actorId);
  }
}

@Service()
@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, User | undefined> {
  constructor(private readonly manageUser: ManageUser) {}

  execute(command: UpdateUserCommand): Promise<User | undefined> {
    return this.manageUser.update(command.id, command.input, command.actorId);
  }
}

@Service()
@CommandHandler(CreateEmployeeCommand)
export class CreateEmployeeHandler implements ICommandHandler<CreateEmployeeCommand, User> {
  constructor(private readonly manageUser: ManageUser) {}

  execute(command: CreateEmployeeCommand): Promise<User> {
    return this.manageUser.create(command.input, command.actorId);
  }
}

@Service()
@CommandHandler(UpdateEmployeeCommand)
export class UpdateEmployeeHandler implements ICommandHandler<UpdateEmployeeCommand, User | undefined> {
  constructor(private readonly manageUser: ManageUser) {}

  execute(command: UpdateEmployeeCommand): Promise<User | undefined> {
    return this.manageUser.update(command.id, command.input, command.actorId);
  }
}
