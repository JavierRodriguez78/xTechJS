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

export type BuiltInRepairStatus = (typeof REPAIR_STATUSES)[number];

/**
 * Estados que los flujos automaticos de presupuesto escriben por su cuenta
 * (`SaveRepairQuote` y `ApproveRepairQuote`). No pueden retirarse de la
 * configuracion sin dejar roto el envio y la aprobacion de presupuestos.
 */
export const AUTOMATED_REPAIR_STATUSES: readonly BuiltInRepairStatus[] = ["quoted", "approved"];

/**
 * El administrador puede añadir estados propios desde la configuracion, asi que
 * el tipo queda abierto. La lista configurada es la unica fuente de verdad sobre
 * que estados son validos en un momento dado.
 */
export type RepairStatus = string;

const allowedTransitions: Record<BuiltInRepairStatus, readonly BuiltInRepairStatus[]> = {
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

export function isBuiltInRepairStatus(value: RepairStatus): value is BuiltInRepairStatus {
  return (REPAIR_STATUSES as readonly string[]).includes(value);
}

/** Un estado base sin salidas cierra la orden y debe seguir cerrandola. */
function isTerminalBuiltInStatus(value: RepairStatus): boolean {
  return isBuiltInRepairStatus(value) && allowedTransitions[value].length === 0;
}

export class RepairStatusNotConfiguredError extends Error {
  constructor(readonly status: RepairStatus) {
    super(`Repair status ${status} is not configured`);
    this.name = "RepairStatusNotConfiguredError";
  }
}

/**
 * `configured` es la lista de estados activos en la configuracion administrativa.
 * Entre dos estados base se aplica la matriz del flujo de taller; cuando alguno
 * es un estado personalizado no hay matriz que aplicar, asi que se permite la
 * transicion salvo que la orden ya estuviera cerrada por un estado base terminal.
 */
export function canTransitionRepairStatus(
  from: RepairStatus,
  to: RepairStatus,
  configured: readonly RepairStatus[] = REPAIR_STATUSES
): boolean {
  if (from === to) return false;
  if (!configured.includes(to)) return false;
  if (isBuiltInRepairStatus(from) && isBuiltInRepairStatus(to)) return allowedTransitions[from].includes(to);
  return !isTerminalBuiltInStatus(from);
}
