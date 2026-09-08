import type { CreateRepairOrderInput, UpdateRepairTechnicalInput } from "../../domain/repair-order.js";
import type { RepairStatus } from "../../domain/repair-status.js";
import type { SaveRepairQuoteInput } from "../../domain/repair-quote.js";

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

export class ListRepairOrdersQuery {}

export class GetRepairStatusHistoryQuery {
  constructor(public readonly id: string) {}
}

export class GetRepairQuoteQuery {
  constructor(public readonly repairOrderId: string) {}
}
