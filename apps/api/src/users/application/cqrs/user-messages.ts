export class BootstrapAdminCommand {
  constructor(public readonly input: { email: string; displayName: string; password: string }) {}
}

export class AuthenticateUserCommand {
  constructor(public readonly email: string, public readonly password: string) {}
}

export class ListUsersQuery {}

export class ListTechniciansQuery {}

export class FindActiveNonAdminUserQuery {
  constructor(public readonly id: string) {}
}