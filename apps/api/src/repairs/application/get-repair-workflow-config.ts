import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairWorkflowConfig } from "./repair-workflow-config.js";

export interface RepairWorkflowConfigView {
  statuses: readonly string[];
  deviceTypes: readonly string[];
}

/**
 * Los tecnicos necesitan los estados y tipos configurados para rellenar los
 * formularios de taller, pero no tienen `users:manage`, asi que la lectura vive
 * aqui con permiso de reparaciones en lugar de en el modulo de administracion.
 */
@Traceable("GetRepairWorkflowConfig")
@Service()
export class GetRepairWorkflowConfig {
  constructor(@Qualifier("repairWorkflowConfig") private readonly workflowConfig: RepairWorkflowConfig) {}

  async execute(): Promise<RepairWorkflowConfigView> {
    const [statuses, deviceTypes] = await Promise.all([
      this.workflowConfig.listStatuses(),
      this.workflowConfig.listDeviceTypes()
    ]);
    return { statuses, deviceTypes };
  }
}
