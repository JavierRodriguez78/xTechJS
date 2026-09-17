import { Service } from "@xtaskjs/core";
import { AdminConfigService } from "../../../users/application/admin-config.js";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { RepairWorkflowConfig } from "../../application/repair-workflow-config.js";

@Traceable("AdminRepairWorkflowConfig")
@Service({ name: "repairWorkflowConfig" })
export class AdminRepairWorkflowConfig implements RepairWorkflowConfig {
  constructor(private readonly adminConfigService: AdminConfigService) {}

  listStatuses(): Promise<readonly string[]> {
    return this.adminConfigService.listRepairStatuses();
  }

  listDeviceTypes(): Promise<readonly string[]> {
    return this.adminConfigService.listDeviceTypes();
  }
}
