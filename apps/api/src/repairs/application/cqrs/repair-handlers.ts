import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { RepairOrder, RepairStatusEvent } from "../../domain/repair-order.js";
import type { RepairQuote } from "../../domain/repair-quote.js";
import type { RepairStep } from "../../domain/repair-step.js";
import type { RepairOrderPage } from "../repair-order-repository.js";
import { ApproveRepairQuote } from "../approve-repair-quote.js";
import { ApproveCustomerRepairQuote } from "../approve-customer-repair-quote.js";
import { ListOwnCustomerRepairs } from "../list-own-customer-repairs.js";
import { GetOwnCustomerQuote } from "../get-own-customer-quote.js";
import { ChangeRepairStatus } from "../change-repair-status.js";
import { CreateRepairOrder } from "../create-repair-order.js";
import { GetRepairQuote } from "../get-repair-quote.js";
import { GetRepairOrder } from "../get-repair-order.js";
import { GetRepairStatusHistory } from "../get-repair-status-history.js";
import { GetRepairWorkflowConfig, type RepairWorkflowConfigView } from "../get-repair-workflow-config.js";
import { ListRepairOrders } from "../list-repair-orders.js";
import { SaveRepairQuote } from "../save-repair-quote.js";
import { UpdateRepairTechnical } from "../update-repair-technical.js";
import { AddRepairStep, DeleteRepairStep, ListRepairSteps, UpdateRepairStep } from "../manage-repair-step.js";
import { ListOwnCustomerRepairSteps } from "../list-own-customer-repair-steps.js";
import { GetRepairTechnicalReport } from "../get-repair-technical-report.js";
import { GetOwnCustomerRepairTechnicalReport } from "../get-own-customer-repair-technical-report.js";
import { GetRepairDevicePasscode } from "../get-repair-device-passcode.js";
import { GetRepairReceipt } from "../get-repair-receipt.js";
import {
  ApproveRepairQuoteCommand,
  ApproveCustomerRepairQuoteCommand,
  AddRepairStepCommand,
  ChangeRepairStatusCommand,
  DeleteRepairStepCommand,
  CreateRepairOrderCommand,
  GetRepairQuoteQuery,
  GetRepairOrderQuery,
  GetRepairDevicePasscodeQuery,
  GetRepairReceiptQuery,
  GetOwnCustomerQuoteQuery,
  GetOwnCustomerRepairTechnicalReportQuery,
  GetRepairTechnicalReportQuery,
  GetRepairStatusHistoryQuery,
  GetRepairWorkflowConfigQuery,
  ListRepairOrdersQuery,
  ListRepairStepsQuery,
  ListOwnCustomerRepairsQuery,
  ListOwnCustomerRepairStepsQuery,
  SaveRepairQuoteCommand,
  UpdateRepairStepCommand,
  UpdateRepairTechnicalCommand
} from "./repair-messages.js";

@Service()
@CommandHandler(AddRepairStepCommand)
export class AddRepairStepHandler implements ICommandHandler<AddRepairStepCommand, RepairStep | undefined> {
  constructor(private readonly useCase: AddRepairStep) {}

  execute(command: AddRepairStepCommand): Promise<RepairStep | undefined> {
    return this.useCase.execute(command.repairOrderId, command.technicianId, command.input);
  }
}

@Service()
@CommandHandler(UpdateRepairStepCommand)
export class UpdateRepairStepHandler implements ICommandHandler<UpdateRepairStepCommand, RepairStep | undefined> {
  constructor(private readonly useCase: UpdateRepairStep) {}

  execute(command: UpdateRepairStepCommand): Promise<RepairStep | undefined> {
    return this.useCase.execute(command.repairOrderId, command.stepId, command.actorId, command.actorRole, command.input);
  }
}

@Service()
@CommandHandler(DeleteRepairStepCommand)
export class DeleteRepairStepHandler implements ICommandHandler<DeleteRepairStepCommand, boolean> {
  constructor(private readonly useCase: DeleteRepairStep) {}

  execute(command: DeleteRepairStepCommand): Promise<boolean> {
    return this.useCase.execute(command.repairOrderId, command.stepId, command.actorId, command.actorRole);
  }
}

@Service()
@CommandHandler(CreateRepairOrderCommand)
export class CreateRepairOrderHandler implements ICommandHandler<CreateRepairOrderCommand, RepairOrder> {
  constructor(private readonly useCase: CreateRepairOrder) {}

  execute(command: CreateRepairOrderCommand): Promise<RepairOrder> {
    return this.useCase.execute(command.input, command.recordedByUserId);
  }
}

@Service()
@QueryHandler(GetRepairDevicePasscodeQuery)
export class GetRepairDevicePasscodeHandler implements IQueryHandler<GetRepairDevicePasscodeQuery, string | undefined> {
  constructor(private readonly useCase: GetRepairDevicePasscode) {}

  execute(query: GetRepairDevicePasscodeQuery): Promise<string | undefined> {
    return this.useCase.execute(query.repairOrderId);
  }
}

@Service()
@QueryHandler(GetRepairReceiptQuery)
export class GetRepairReceiptHandler implements IQueryHandler<GetRepairReceiptQuery, Buffer | undefined> {
  constructor(private readonly useCase: GetRepairReceipt) {}

  execute(query: GetRepairReceiptQuery): Promise<Buffer | undefined> {
    return this.useCase.execute(query.repairOrderId);
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
export class ListRepairOrdersHandler implements IQueryHandler<ListRepairOrdersQuery, RepairOrderPage> {
  constructor(private readonly useCase: ListRepairOrders) {}

  execute(query: ListRepairOrdersQuery): Promise<RepairOrderPage> {
    return this.useCase.execute(query.options);
  }
}

@Service()
@QueryHandler(GetRepairOrderQuery)
export class GetRepairOrderHandler implements IQueryHandler<GetRepairOrderQuery, RepairOrder | undefined> {
  constructor(private readonly useCase: GetRepairOrder) {}

  execute(query: GetRepairOrderQuery): Promise<RepairOrder | undefined> {
    return this.useCase.execute(query.id);
  }
}

@Service()
@QueryHandler(GetRepairWorkflowConfigQuery)
export class GetRepairWorkflowConfigHandler implements IQueryHandler<GetRepairWorkflowConfigQuery, RepairWorkflowConfigView> {
  constructor(private readonly useCase: GetRepairWorkflowConfig) {}

  execute(): Promise<RepairWorkflowConfigView> {
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

@Service()
@QueryHandler(ListRepairStepsQuery)
export class ListRepairStepsHandler implements IQueryHandler<ListRepairStepsQuery, readonly RepairStep[] | undefined> {
  constructor(private readonly useCase: ListRepairSteps) {}

  execute(query: ListRepairStepsQuery): Promise<readonly RepairStep[] | undefined> {
    return this.useCase.execute(query.repairOrderId);
  }
}

@Service()
@QueryHandler(ListOwnCustomerRepairStepsQuery)
export class ListOwnCustomerRepairStepsHandler implements IQueryHandler<ListOwnCustomerRepairStepsQuery, readonly RepairStep[] | undefined> {
  constructor(private readonly useCase: ListOwnCustomerRepairSteps) {}

  execute(query: ListOwnCustomerRepairStepsQuery): Promise<readonly RepairStep[] | undefined> {
    return this.useCase.execute(query.repairOrderId, query.email);
  }
}

@Service()
@QueryHandler(GetRepairTechnicalReportQuery)
export class GetRepairTechnicalReportHandler implements IQueryHandler<GetRepairTechnicalReportQuery, Buffer | undefined> {
  constructor(private readonly useCase: GetRepairTechnicalReport) {}

  execute(query: GetRepairTechnicalReportQuery): Promise<Buffer | undefined> {
    return this.useCase.execute(query.repairOrderId);
  }
}

@Service()
@QueryHandler(GetOwnCustomerRepairTechnicalReportQuery)
export class GetOwnCustomerRepairTechnicalReportHandler implements IQueryHandler<GetOwnCustomerRepairTechnicalReportQuery, Buffer | undefined> {
  constructor(private readonly useCase: GetOwnCustomerRepairTechnicalReport) {}

  execute(query: GetOwnCustomerRepairTechnicalReportQuery): Promise<Buffer | undefined> {
    return this.useCase.execute(query.repairOrderId, query.email);
  }
}
