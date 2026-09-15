export class BootstrapAdminCommand {
  constructor(public readonly input: { email: string; displayName: string; password: string }) {}
}

export class AuthenticateUserCommand {
  constructor(public readonly email: string, public readonly password: string) {}
}

export class ListUsersQuery {}

export class ListAuditLogsQuery {}

export class ListTechniciansQuery {}

export class FindActiveNonAdminUserQuery {
  constructor(public readonly id: string) {}
}

export class CreateUserCommand {
  constructor(public readonly input: { email: string; displayName: string; role: "admin" | "technician" | "customer"; password: string }) {}
}

export class UpdateUserCommand {
  constructor(public readonly id: string, public readonly input: { email?: string; displayName?: string; role?: "admin" | "technician" | "customer"; active?: boolean; password?: string }) {}
}