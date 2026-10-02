import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { DeviceTypeNotConfiguredError, isConfiguredDeviceType } from "../domain/device-type.js";
import type { CreateRepairOrderInput, RepairOrder } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import type { RepairWorkflowConfig } from "./repair-workflow-config.js";
import type { UserRepository } from "../../users/application/user-repository.js";
import { DevicePasscodeCipher } from "./device-passcode-cipher.js";
import { assertActiveTechnician } from "./technician-assignment.js";
import { SaveRepairQuote } from "./save-repair-quote.js";

@Traceable("CreateRepairOrder")
@Service()
export class CreateRepairOrder {
  constructor(
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    @Qualifier("repairWorkflowConfig") private readonly workflowConfig: RepairWorkflowConfig,
    @Qualifier("userRepository") private readonly userRepository: UserRepository,
    private readonly passcodeCipher: DevicePasscodeCipher,
    private readonly saveRepairQuote: SaveRepairQuote
  ) {}

  async execute(input: CreateRepairOrderInput, recordedByUserId: string): Promise<RepairOrder> {
    const deviceType = input.deviceType.trim();
    const [configuredDeviceTypes, deviceCatalog] = await Promise.all([this.workflowConfig.listDeviceTypes(), this.workflowConfig.listDeviceCatalog()]);
    if (!isConfiguredDeviceType(deviceType, configuredDeviceTypes)) {
      throw new DeviceTypeNotConfiguredError(deviceType);
    }
    const catalogForType = deviceCatalog.filter((entry) => entry.deviceType === deviceType);
    if (catalogForType.length && !catalogForType.some((entry) => entry.brand === input.brand.trim() && entry.model === input.model.trim())) {
      throw new DeviceModelNotConfiguredError(deviceType, input.brand.trim(), input.model.trim());
    }
    if (input.technicianId) await assertActiveTechnician(this.userRepository, input.technicianId);
    if (!input.storeId) throw new Error("A store is required to create a repair order");
    const passcode = input.devicePasscode?.trim();

    const repair = await this.repairOrderRepository.create({
      id: randomUUID(),
      storeId: input.storeId,
      customerId: input.customerId,
      deviceType,
      brand: input.brand.trim(),
      model: input.model.trim(),
      serialNumber: input.serialNumber?.trim(),
      reportedIssue: input.reportedIssue.trim(),
      deliveredAccessories: input.deliveredAccessories?.trim(),
      technicianId: input.technicianId,
      estimatedCompletionAt: input.estimatedCompletionAt,
      preRepairCondition: input.preRepairCondition,
      devicePasscodeEncrypted: passcode ? this.passcodeCipher.encrypt(passcode) : undefined,
      recordedByUserId
    });
    if (input.initialQuoteLines?.length) await this.saveRepairQuote.execute(repair.id, { lines: input.initialQuoteLines, status: "draft" });
    return repair;
  }
}

export class DeviceModelNotConfiguredError extends Error {
  constructor(readonly deviceType: string, readonly brand: string, readonly model: string) {
    super(`Device ${brand} ${model} is not configured for ${deviceType}`);
    this.name = "DeviceModelNotConfiguredError";
  }
}
