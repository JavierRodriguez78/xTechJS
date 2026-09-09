import type { CreateCustomerInput, UpdateCustomerInput } from "../../domain/customer.js";

export class CreateCustomerCommand {
  constructor(public readonly input: CreateCustomerInput) {}
}

export class UpdateCustomerCommand {
  constructor(public readonly id: string, public readonly input: UpdateCustomerInput) {}
}

export class ListCustomersQuery {}

export class GetCustomerQuery {
  constructor(public readonly id: string) {}
}

export class ListCustomerRepairsQuery {
  constructor(public readonly customerId: string) {}
}
