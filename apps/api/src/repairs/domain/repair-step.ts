export interface RepairStep {
  id: string;
  repairOrderId: string;
  sequence: number;
  title: string;
  description: string | null;
  technicianId: string;
  performedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRepairStepInput {
  title: string;
  description?: string;
  performedAt?: Date;
}

export interface UpdateRepairStepInput {
  title?: string;
  description?: string;
  performedAt?: Date;
}