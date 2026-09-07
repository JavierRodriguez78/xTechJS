import { randomUUID } from "node:crypto";
import type { CreateRepairOrderInput, RepairOrder } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";

export class CreateRepairOrder {
  constructor(private readonly repairOrderRepository: RepairOrderRepository) {}

  execute(input: CreateRepairOrderInput): Promise<RepairOrder> {
    return this.repairOrderRepository.create({
      id: randomUUID(),
      customerId: input.customerId,
      deviceType: input.deviceType.trim(),
      brand: input.brand.trim(),
      model: input.model.trim(),
      serialNumber: input.serialNumber?.trim(),
      reportedIssue: input.reportedIssue.trim(),
      deliveredAccessories: input.deliveredAccessories?.trim()
    });
  }
}