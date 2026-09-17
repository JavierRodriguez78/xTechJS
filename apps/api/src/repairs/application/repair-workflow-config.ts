/**
 * Puerto de la configuracion administrativa que el modulo de reparaciones
 * necesita. Aisla los casos de uso del almacenamiento de configuracion y permite
 * doblarlo en las pruebas.
 */
export interface RepairWorkflowConfig {
  listStatuses(): Promise<readonly string[]>;
  listDeviceTypes(): Promise<readonly string[]>;
}
