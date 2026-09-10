import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { RepairOrder, RepairStatusEvent } from "../../domain/repair-order.js";
import type { RepairQuote } from "../../domain/repair-quote.js";
import { ApproveRepairQuote } from "../approve-repair-quote.js";
import { ApproveCustomerRepairQuote } from "../approve-customer-repair-quote.js";
import { ListOwnCustomerRepairs } from "../list-own-customer-repairs.js";
import { GetOwnCustomerQuote } from "../get-own-customer-quote.js";
import { ChangeRepairStatus } from "../change-repair-status.js";
import { CreateRepairOrder } from "../create-repair-order.js";
import { GetRepairQuote } from "../get-repair-quote.js";
import { GetRepairStatusHistory } from "../get-repair-status-history.js";
import { ListRepairOrders } from "../list-repair-orders.js";
import { SaveRepairQuote } from "../save-repair-quote.js";
import { UpdateRepairTechnical } from "../update-repair-technical.js";
import {
  ApproveRepairQuoteCommand,
  ApproveCustomerRepairQuoteCommand,
  ChangeRepairStatusCommand,
  CreateRepairOrderCommand,
  GetRepairQuoteQuery,
  GetOwnCustomerQuoteQuery,
  GetRepairStatusHistoryQuery,
  ListRepairOrdersQuery,
  ListOwnCustomerRepairsQuery,
  SaveRepairQuoteCommand,
  UpdateRepairTechnicalCommand
} from "./repair-messages.js";

@Service()
@CommandHandler(CreateRepairOrderCommand)
export class CreateRepairOrderHandler implements ICommandHandler<CreateRepairOrderCommand, RepairOrder> {
  constructor(private readonly useCase: CreateRepairOrder) {}

  execute(command: CreateRepairOrderCommand): Promise<RepairOrder> {
    return this.useCase.execute(command.input);
  }
}

@Service()
@CommandHandler(ChangeRepairStatusCommand)
export class ChangeRepairStatusHandler implements ICommandHandler<ChangeRepairStatusCommand, RepairOrder | undefined> {
  constructor(private readonly useCase: ChangeRepairStatus) {}

  execute(command: ChangeRepairStatusCommand): Promise<RepairOrder | undefined> {
    return this.useCase.execute(command.id, command.status, command.note);
  }
}

@Service()
@CommandHandler(UpdateRepairTechnicalCommand)
export class UpdateRepairTechnicalHandler implements ICommandHandler<UpdateRepairTechnicalCommand, RepairOrder | undefined> {
  constructor(private readonly useCase: UpdateRepairTechnical) {}

  execute(command: UpdateRepairTechnicalCommand): Promise<RepairOrder | undefined> {
    return this.useCase.execute(command.id, command.input);
  }
}

@Service()
@CommandHandler(SaveRepairQuoteCommand)
export class SaveRepairQuoteHandler implements ICommandHandler<SaveRepairQuoteCommand, RepairQuote | undefined> {
  constructor(private readonly useCase: SaveRepairQuote) {}

  execute(command: SaveRepairQuoteCommand): Promise<RepairQuote | undefined> {
    return this.useCase.execute(command.repairOrderId, command.input);
  }
}

@Service()
@CommandHandler(ApproveRepairQuoteCommand)
export class ApproveRepairQuoteHandler implements ICommandHandler<ApproveRepairQuoteCommand, RepairQuote | undefined> {
  constructor(private readonly useCase: ApproveRepairQuote) {}

  execute(command: ApproveRepairQuoteCommand): Promise<RepairQuote | undefined> {
    return this.useCase.execute(command.repairOrderId);
  }
}

@Service()
@CommandHandler(ApproveCustomerRepairQuoteCommand)
export class ApproveCustomerRepairQuoteHandler implements ICommandHandler<ApproveCustomerRepairQuoteCommand, RepairQuote | undefined> {
  constructor(private readonly useCase: ApproveCustomerRepairQuote) {}

  execute(command: ApproveCustomerRepairQuoteCommand): Promise<RepairQuote | undefined> {
    return this.useCase.execute(command.repairOrderId, command.email);
  }
}

@Service()
@QueryHandler(ListRepairOrdersQuery)
export class ListRepairOrdersHandler implements IQueryHandler<ListRepairOrdersQuery, readonly RepairOrder[]> {
  constructor(private readonly useCase: ListRepairOrders) {}

  execute(): Promise<readonly RepairOrder[]> {
    return this.useCase.execute();
  }
}

@Service()
@QueryHandler(GetRepairStatusHistoryQuery)
export class GetRepairStatusHistoryHandler implements IQueryHandler<GetRepairStatusHistoryQuery, readonly RepairStatusEvent[]> {
  constructor(private readonly useCase: GetRepairStatusHistory) {}

  execute(query: GetRepairStatusHistoryQuery): Promise<readonly RepairStatusEvent[]> {
    return this.useCase.execute(query.id);
  }
}

@Service()
@QueryHandler(GetRepairQuoteQuery)
export class GetRepairQuoteHandler implements IQueryHandler<GetRepairQuoteQuery, RepairQuote | undefined> {
  constructor(private readonly useCase: GetRepairQuote) {}

  execute(query: GetRepairQuoteQuery): Promise<RepairQuote | undefined> {
    return this.useCase.execute(query.repairOrderId);
  }
}

@Service()
@QueryHandler(ListOwnCustomerRepairsQuery)
export class ListOwnCustomerRepairsHandler implements IQueryHandler<ListOwnCustomerRepairsQuery, readonly RepairOrder[]> {
  constructor(private readonly useCase: ListOwnCustomerRepairs) {}

  execute(query: ListOwnCustomerRepairsQuery): Promise<readonly RepairOrder[]> {
    return this.useCase.execute(query.email);
  }
}

@Service()
@QueryHandler(GetOwnCustomerQuoteQuery)
export class GetOwnCustomerQuoteHandler implements IQueryHandler<GetOwnCustomerQuoteQuery, RepairQuote | undefined> {
  constructor(private readonly useCase: GetOwnCustomerQuote) {}

  execute(query: GetOwnCustomerQuoteQuery): Promise<RepairQuote | undefined> {
    return this.useCase.execute(query.repairOrderId, query.email);
  }
}
