import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import type { CreateRepairOrderInput, RepairOrder } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";

@Service()
export class CreateRepairOrder {
  constructor(@Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository) {}

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