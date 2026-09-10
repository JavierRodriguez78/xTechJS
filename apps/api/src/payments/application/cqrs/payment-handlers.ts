import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { Payment } from "../../domain/payment.js";
import { CreatePayment } from "../create-payment.js";
import { ListPayments } from "../list-payments.js";
import { ListRepairPayments } from "../list-repair-payments.js";
import { CreatePaymentCommand, ListPaymentsQuery, ListRepairPaymentsQuery } from "./payment-messages.js";

@Service()
@CommandHandler(CreatePaymentCommand)
export class CreatePaymentHandler implements ICommandHandler<CreatePaymentCommand, Payment> {
  constructor(private readonly useCase: CreatePayment) {}
  execute(command: CreatePaymentCommand): Promise<Payment> { return this.useCase.execute(command.input); }
}

@Service()
@QueryHandler(ListPaymentsQuery)
export class ListPaymentsHandler implements IQueryHandler<ListPaymentsQuery, readonly Payment[]> {
  constructor(private readonly useCase: ListPayments) {}
  execute(): Promise<readonly Payment[]> { return this.useCase.execute(); }
}

@Service()
@QueryHandler(ListRepairPaymentsQuery)
export class ListRepairPaymentsHandler implements IQueryHandler<ListRepairPaymentsQuery, readonly Payment[]> {
  constructor(private readonly useCase: ListRepairPayments) {}
  execute(query: ListRepairPaymentsQuery): Promise<readonly Payment[]> { return this.useCase.execute(query.repairOrderId); }
}
