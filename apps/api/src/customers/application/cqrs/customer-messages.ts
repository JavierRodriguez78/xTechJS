import type { CreateCustomerInput, UpdateCustomerInput } from "../../domain/customer.js";
import type { CustomerListOptions } from "../customer-repository.js";

export class CreateCustomerCommand {
  constructor(public readonly input: CreateCustomerInput) {}
}

export class UpdateCustomerCommand {
  constructor(public readonly id: string, public readonly input: UpdateCustomerInput) {}
}

export class ResendCustomerInvitationCommand {
  constructor(public readonly id: string) {}
}

export class ListCustomersQuery {
  constructor(public readonly options: CustomerListOptions) {}
}

export class GetCustomerQuery {
  constructor(public readonly id: string) {}
}

export class ListCustomerRepairsQuery {
  constructor(public readonly customerId: string) {}
}

export class ListCustomerCommunicationsQuery {
  constructor(public readonly customerId: string) {}
}
