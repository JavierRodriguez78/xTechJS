import type { RepairOrder } from "../domain/repair-order.js";

/**
 * Puerto del aviso al cliente tras un cambio de estado. El modulo de
 * reparaciones no decide si hay plantilla, ni como se envia: solo anuncia que el
 * estado ya esta persistido.
 */
export interface RepairStatusNotifier {
  notifyStatusChange(repair: RepairOrder, note?: string): Promise<void>;
}
