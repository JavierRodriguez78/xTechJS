import type { RepairStep } from "../domain/repair-step.js";

export interface NewRepairStepRecord {
  id: string;
  repairOrderId: string;
  sequence: number;
  title: string;
  description: string | null;
  technicianId: string;
  performedAt: Date;
}

export interface RepairStepRepository {
  create(record: NewRepairStepRecord): Promise<RepairStep>;
  findById(id: string): Promise<RepairStep | undefined>;
  listByRepairOrder(repairOrderId: string): Promise<readonly RepairStep[]>;
  nextSequence(repairOrderId: string): Promise<number>;
  update(id: string, input: Pick<RepairStep, "title" | "description" | "performedAt">): Promise<RepairStep | undefined>;
  delete(id: string): Promise<void>;
}