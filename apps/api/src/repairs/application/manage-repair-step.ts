import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { UserRole } from "../../shared/domain/user-role.js";
import type { RepairAttachmentRepository } from "../../attachments/application/repair-attachment-repository.js";
import type { AttachmentStorage } from "../../attachments/application/attachment-storage.js";
import type { CreateRepairStepInput, RepairStep, UpdateRepairStepInput } from "../domain/repair-step.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import type { RepairStepRepository } from "./repair-step-repository.js";

export class RepairStepAccessDeniedError extends Error {}

@Traceable("AddRepairStep")
@Service()
export class AddRepairStep {
  constructor(
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    @Qualifier("repairStepRepository") private readonly repairStepRepository: RepairStepRepository
  ) {}

  async execute(repairOrderId: string, technicianId: string, input: CreateRepairStepInput): Promise<RepairStep | undefined> {
    if (!await this.repairOrderRepository.findById(repairOrderId)) return undefined;
    return this.repairStepRepository.create({
      id: randomUUID(),
      repairOrderId,
      sequence: await this.repairStepRepository.nextSequence(repairOrderId),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      technicianId,
      performedAt: input.performedAt ?? new Date()
    });
  }
}

@Traceable("UpdateRepairStep")
@Service()
export class UpdateRepairStep {
  constructor(@Qualifier("repairStepRepository") private readonly repairStepRepository: RepairStepRepository) {}

  async execute(repairOrderId: string, stepId: string, actorId: string, actorRole: UserRole, input: UpdateRepairStepInput): Promise<RepairStep | undefined> {
    const step = await this.repairStepRepository.findById(stepId);
    if (!step || step.repairOrderId !== repairOrderId) return undefined;
    if (actorRole !== "admin" && step.technicianId !== actorId) throw new RepairStepAccessDeniedError("Only the author or an administrator can edit a repair step");
    return this.repairStepRepository.update(stepId, {
      title: input.title?.trim() || step.title,
      description: input.description === undefined ? step.description : input.description.trim() || null,
      performedAt: input.performedAt ?? step.performedAt
    });
  }
}

@Traceable("DeleteRepairStep")
@Service()
export class DeleteRepairStep {
  constructor(
    @Qualifier("repairStepRepository") private readonly repairStepRepository: RepairStepRepository,
    @Qualifier("repairAttachmentRepository") private readonly attachmentRepository: RepairAttachmentRepository,
    @Qualifier("attachmentStorage") private readonly storage: AttachmentStorage
  ) {}

  async execute(repairOrderId: string, stepId: string, actorId: string, actorRole: UserRole): Promise<boolean> {
    const step = await this.repairStepRepository.findById(stepId);
    if (!step || step.repairOrderId !== repairOrderId) return false;
    if (actorRole !== "admin" && step.technicianId !== actorId) throw new RepairStepAccessDeniedError("Only the author or an administrator can delete a repair step");
    for (const attachment of await this.attachmentRepository.listByRepairStep(stepId)) {
      await this.storage.delete(attachment.storageKey);
      await this.attachmentRepository.delete(attachment.id);
    }
    await this.repairStepRepository.delete(stepId);
    return true;
  }
}

@Traceable("ListRepairSteps")
@Service()
export class ListRepairSteps {
  constructor(
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    @Qualifier("repairStepRepository") private readonly repairStepRepository: RepairStepRepository
  ) {}

  async execute(repairOrderId: string): Promise<readonly RepairStep[] | undefined> {
    if (!await this.repairOrderRepository.findById(repairOrderId)) return undefined;
    return this.repairStepRepository.listByRepairOrder(repairOrderId);
  }
}