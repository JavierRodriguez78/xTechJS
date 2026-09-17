/**
 * Estados del flujo base del taller. El administrador puede añadir estados
 * propios, asi que esta lista sirve solo para traducirlos y darles color: la
 * lista de estados activos se pide a `GET /api/repairs/config`.
 */
export const BUILT_IN_REPAIR_STATUSES = [
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

export type BuiltInRepairStatus = (typeof BUILT_IN_REPAIR_STATUSES)[number];

const labels: Record<BuiltInRepairStatus, string> = {
  received: "Recibido",
  diagnosing: "En diagnóstico",
  quoted: "Presupuestado",
  approved: "Aprobado",
  repairing: "En reparación",
  testing: "En pruebas",
  repaired: "Reparado",
  delivered: "Entregado",
  unrepairable: "No reparable",
  cancelled: "Cancelado"
};

const tones: Record<BuiltInRepairStatus, string> = {
  received: "neutral",
  diagnosing: "amber",
  quoted: "amber",
  approved: "blue",
  repairing: "blue",
  testing: "blue",
  repaired: "green",
  delivered: "green",
  unrepairable: "danger",
  cancelled: "danger"
};

function isBuiltIn(status: string): status is BuiltInRepairStatus {
  return (BUILT_IN_REPAIR_STATUSES as readonly string[]).includes(status);
}

/** Un estado personalizado se muestra legible en lugar de como codigo interno. */
function humanize(status: string): string {
  const text = status.replace(/[-_.]+/g, " ").trim();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : status;
}

export function repairStatusLabel(status: string): string {
  return isBuiltIn(status) ? labels[status] : humanize(status);
}

export function repairStatusTone(status: string): string {
  return isBuiltIn(status) ? tones[status] : "neutral";
}
