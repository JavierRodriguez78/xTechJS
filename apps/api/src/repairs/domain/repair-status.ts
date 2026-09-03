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