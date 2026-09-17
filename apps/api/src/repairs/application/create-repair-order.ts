import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { DeviceTypeNotConfiguredError, isConfiguredDeviceType } from "../domain/device-type.js";
import type { CreateRepairOrderInput, RepairOrder } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import type { RepairWorkflowConfig } from "./repair-workflow-config.js";

@Traceable("CreateRepairOrder")
@Service()
export class CreateRepairOrder {
  constructor(
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    @Qualifier("repairWorkflowConfig") private readonly workflowConfig: RepairWorkflowConfig
  ) {}

  async execute(input: CreateRepairOrderInput): Promise<RepairOrder> {
    const deviceType = input.deviceType.trim();
    const configuredDeviceTypes = await this.workflowConfig.listDeviceTypes();
    if (!isConfiguredDeviceType(deviceType, configuredDeviceTypes)) {
      throw new DeviceTypeNotConfiguredError(deviceType);
    }

    return this.repairOrderRepository.create({
      id: randomUUID(),
      customerId: input.customerId,
      deviceType,
      brand: input.brand.trim(),
      model: input.model.trim(),
      serialNumber: input.serialNumber?.trim(),
      reportedIssue: input.reportedIssue.trim(),
      deliveredAccessories: input.deliveredAccessories?.trim()
    });
  }
}
