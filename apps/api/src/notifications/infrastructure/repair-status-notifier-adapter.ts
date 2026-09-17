import { Service } from "@xtaskjs/core";
import type { RepairOrder } from "../../repairs/domain/repair-order.js";
import type { RepairStatusNotifier } from "../../repairs/application/repair-status-notifier.js";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { NotifyRepairStatusChange } from "../application/notify-repair-status-change.js";

@Traceable("RepairStatusNotifierAdapter")
@Service({ name: "repairStatusNotifier" })
export class RepairStatusNotifierAdapter implements RepairStatusNotifier {
  constructor(private readonly notifyRepairStatusChange: NotifyRepairStatusChange) {}

  async notifyStatusChange(repair: RepairOrder, note?: string): Promise<void> {
    await this.notifyRepairStatusChange.execute(repair, note);
  }
}
