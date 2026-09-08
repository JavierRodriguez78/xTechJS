import { Qualifier, Service } from "@xtaskjs/core";
import type { UserRepository } from "../../users/application/user-repository.js";
import type { RepairOrder, UpdateRepairTechnicalInput } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";

@Service()
export class UpdateRepairTechnical {
  constructor(@Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository, @Qualifier("userRepository") private readonly userRepository: UserRepository) {}

  async execute(id: string, input: UpdateRepairTechnicalInput): Promise<RepairOrder | undefined> {
    if (input.technicianId) {
      const technician = await this.userRepository.findById(input.technicianId);
      if (!technician?.active || technician.role !== "technician") throw new Error("Assigned user must be an active technician");
    }
    return this.repairOrderRepository.updateTechnical(id, { technicianId: input.technicianId, diagnosis: input.diagnosis?.trim() });
  }
}