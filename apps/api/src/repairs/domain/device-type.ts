export class DeviceTypeNotConfiguredError extends Error {
  constructor(readonly deviceType: string) {
    super(`Device type ${deviceType} is not configured`);
    this.name = "DeviceTypeNotConfiguredError";
  }
}

/**
 * Los tipos de dispositivo los define el administrador. Una lista vacia se
 * interpreta como "sin restriccion" en lugar de bloquear el alta de ordenes:
 * borrar todos los tipos no puede dejar el taller sin poder recepcionar equipos.
 */
export function isConfiguredDeviceType(deviceType: string, configured: readonly string[]): boolean {
  if (configured.length === 0) return true;
  return configured.some((value) => value.localeCompare(deviceType, undefined, { sensitivity: "accent" }) === 0);
}
