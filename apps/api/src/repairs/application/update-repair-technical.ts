import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { UserRepository } from "../../users/application/user-repository.js";
import type { RepairOrder, UpdateRepairTechnicalInput } from "../domain/repair-order.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import { assertActiveTechnician } from "./technician-assignment.js";

@Traceable("UpdateRepairTechnical")
@Service()
export class UpdateRepairTechnical {
  constructor(@Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository, @Qualifier("userRepository") private readonly userRepository: UserRepository) {}

  async execute(id: string, input: UpdateRepairTechnicalInput): Promise<RepairOrder | undefined> {
    if (input.technicianId) {
      await assertActiveTechnician(this.userRepository, input.technicianId);
    }
    return this.repairOrderRepository.updateTechnical(id, { technicianId: input.technicianId, diagnosis: input.diagnosis?.trim() });
  }
}