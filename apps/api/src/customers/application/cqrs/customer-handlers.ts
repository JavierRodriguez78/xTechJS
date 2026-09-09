import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { Customer } from "../../domain/customer.js";
import { CreateCustomer } from "../create-customer.js";
import { GetCustomer } from "../get-customer.js";
import { ListCustomers } from "../list-customers.js";
import { UpdateCustomer } from "../update-customer.js";
import { ListCustomerRepairs } from "../../../repairs/application/list-customer-repairs.js";
import type { RepairOrder } from "../../../repairs/domain/repair-order.js";
import { CreateCustomerCommand, GetCustomerQuery, ListCustomerRepairsQuery, ListCustomersQuery, UpdateCustomerCommand } from "./customer-messages.js";

@Service()
@CommandHandler(CreateCustomerCommand)
export class CreateCustomerHandler implements ICommandHandler<CreateCustomerCommand, Customer> {
  constructor(private readonly createCustomer: CreateCustomer) {}

  execute(command: CreateCustomerCommand): Promise<Customer> {
    return this.createCustomer.execute(command.input);
  }
}

@Service()
@CommandHandler(UpdateCustomerCommand)
export class UpdateCustomerHandler implements ICommandHandler<UpdateCustomerCommand, Customer | undefined> {
  constructor(private readonly updateCustomer: UpdateCustomer) {}

  execute(command: UpdateCustomerCommand): Promise<Customer | undefined> {
    return this.updateCustomer.execute(command.id, command.input);
  }
}

@Service()
@QueryHandler(ListCustomersQuery)
export class ListCustomersHandler implements IQueryHandler<ListCustomersQuery, readonly Customer[]> {
  constructor(private readonly listCustomers: ListCustomers) {}

  execute(): Promise<readonly Customer[]> {
    return this.listCustomers.execute();
  }
}

@Service()
@QueryHandler(GetCustomerQuery)
export class GetCustomerHandler implements IQueryHandler<GetCustomerQuery, Customer | undefined> {
  constructor(private readonly getCustomer: GetCustomer) {}

  execute(query: GetCustomerQuery): Promise<Customer | undefined> {
    return this.getCustomer.execute(query.id);
  }
}

@Service()
@QueryHandler(ListCustomerRepairsQuery)
export class ListCustomerRepairsHandler implements IQueryHandler<ListCustomerRepairsQuery, readonly RepairOrder[]> {
  constructor(private readonly listCustomerRepairs: ListCustomerRepairs) {}

  execute(query: ListCustomerRepairsQuery): Promise<readonly RepairOrder[]> {
    return this.listCustomerRepairs.execute(query.customerId);
  }
}
