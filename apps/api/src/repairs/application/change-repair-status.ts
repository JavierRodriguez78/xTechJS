import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairOrder } from "../domain/repair-order.js";
import { RepairStatusNotConfiguredError, canTransitionRepairStatus, type RepairStatus } from "../domain/repair-status.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import type { RepairStatusNotifier } from "./repair-status-notifier.js";
import type { RepairWorkflowConfig } from "./repair-workflow-config.js";

@Traceable("ChangeRepairStatus")
@Service()
export class ChangeRepairStatus {
  constructor(
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    @Qualifier("repairWorkflowConfig") private readonly workflowConfig: RepairWorkflowConfig,
    @Qualifier("repairStatusNotifier") private readonly statusNotifier: RepairStatusNotifier
  ) {}

  async execute(id: string, status: RepairStatus, note?: string): Promise<RepairOrder | undefined> {
    const repair = await this.repairOrderRepository.findById(id);
    if (!repair) return undefined;

    const configuredStatuses = await this.workflowConfig.listStatuses();
    if (!configuredStatuses.includes(status)) {
      throw new RepairStatusNotConfiguredError(status);
    }
    if (!canTransitionRepairStatus(repair.status, status, configuredStatuses)) {
      throw new Error(`Cannot change repair status from ${repair.status} to ${status}`);
    }

    const updated = await this.repairOrderRepository.changeStatus(id, status, note?.trim());
    if (updated) await this.statusNotifier.notifyStatusChange(updated, note);
    return updated;
  }
}
