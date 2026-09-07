export const REPAIR_STATUSES = [
  "received",
  "diagnosing",
  "quoted",
  "approved",
  "repairing",
  "testing",
  "repaired",
  "delivered",
  "unrepairable",
  "cancelled"
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

const allowedTransitions: Record<RepairStatus, readonly RepairStatus[]> = {
  received: ["diagnosing", "cancelled"],
  diagnosing: ["quoted", "repairing", "unrepairable", "cancelled"],
  quoted: ["approved", "cancelled"],
  approved: ["repairing", "cancelled"],
  repairing: ["testing", "unrepairable", "cancelled"],
  testing: ["repairing", "repaired", "unrepairable"],
  repaired: ["delivered"],
  delivered: [],
  unrepairable: ["delivered", "cancelled"],
  cancelled: []
};

export function canTransitionRepairStatus(from: RepairStatus, to: RepairStatus): boolean {
  return allowedTransitions[from].includes(to);
}