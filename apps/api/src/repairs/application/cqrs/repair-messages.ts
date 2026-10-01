import type { CreateRepairOrderInput, UpdateRepairTechnicalInput } from "../../domain/repair-order.js";
import type { RepairStatus } from "../../domain/repair-status.js";
import type { SaveRepairQuoteInput } from "../../domain/repair-quote.js";
import type { CreateRepairStepInput, UpdateRepairStepInput } from "../../domain/repair-step.js";
import type { UserRole } from "../../../shared/domain/user-role.js";
import type { RepairOrderListOptions } from "../repair-order-repository.js";

export class CreateRepairOrderCommand {
  constructor(public readonly input: CreateRepairOrderInput) {}
}

export class ChangeRepairStatusCommand {
  constructor(public readonly id: string, public readonly status: RepairStatus, public readonly note?: string) {}
}

export class UpdateRepairTechnicalCommand {
  constructor(public readonly id: string, public readonly input: UpdateRepairTechnicalInput) {}
}

export class SaveRepairQuoteCommand {
  constructor(public readonly repairOrderId: string, public readonly input: SaveRepairQuoteInput) {}
}

export class ApproveRepairQuoteCommand {
  constructor(public readonly repairOrderId: string) {}
}

export class ApproveCustomerRepairQuoteCommand {
  constructor(public readonly repairOrderId: string, public readonly email: string) {}
}

export class AddRepairStepCommand {
  constructor(public readonly repairOrderId: string, public readonly technicianId: string, public readonly input: CreateRepairStepInput) {}
}

export class UpdateRepairStepCommand {
  constructor(public readonly repairOrderId: string, public readonly stepId: string, public readonly actorId: string, public readonly actorRole: UserRole, public readonly input: UpdateRepairStepInput) {}
}

export class DeleteRepairStepCommand {
  constructor(public readonly repairOrderId: string, public readonly stepId: string, public readonly actorId: string, public readonly actorRole: UserRole) {}
}

export class ListRepairOrdersQuery {
  constructor(public readonly options: RepairOrderListOptions) {}
}

export class GetRepairOrderQuery {
  constructor(public readonly id: string) {}
}

export class GetRepairWorkflowConfigQuery {}

export class GetRepairStatusHistoryQuery {
  constructor(public readonly id: string) {}
}

export class GetRepairQuoteQuery {
  constructor(public readonly repairOrderId: string) {}
}

export class ListOwnCustomerRepairsQuery {
  constructor(public readonly email: string) {}
}

export class GetOwnCustomerQuoteQuery {
  constructor(public readonly repairOrderId: string, public readonly email: string) {}
}

export class ListRepairStepsQuery {
  constructor(public readonly repairOrderId: string) {}
}

export class ListOwnCustomerRepairStepsQuery {
  constructor(public readonly repairOrderId: string, public readonly email: string) {}
}

export class GetRepairTechnicalReportQuery {
  constructor(public readonly repairOrderId: string) {}
}

export class GetOwnCustomerRepairTechnicalReportQuery {
  constructor(public readonly repairOrderId: string, public readonly email: string) {}
}
