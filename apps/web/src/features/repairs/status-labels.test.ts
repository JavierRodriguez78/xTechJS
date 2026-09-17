import { describe, expect, it } from "vitest";
import { BUILT_IN_REPAIR_STATUSES, repairStatusLabel, repairStatusTone } from "./status-labels";

describe("etiquetas de estado de reparacion", () => {
  it("traduce todos los estados del flujo base sin dejar escapar el codigo interno", () => {
    for (const status of BUILT_IN_REPAIR_STATUSES) {
      const label = repairStatusLabel(status);
      expect(label).not.toBe(status);
      expect(label).not.toMatch(/^[a-z]+$/);
    }
  });

  it("asigna un tono a cada estado del flujo base", () => {
    for (const status of BUILT_IN_REPAIR_STATUSES) {
      expect(repairStatusTone(status)).not.toBe("");
    }
  });

  it("muestra legible un estado añadido por el administrador", () => {
    expect(repairStatusLabel("awaiting-parts")).toBe("Awaiting parts");
    expect(repairStatusLabel("esperando_pieza")).toBe("Esperando pieza");
  });

  it("da tono neutro a un estado personalizado en lugar de fallar", () => {
    expect(repairStatusTone("awaiting-parts")).toBe("neutral");
  });
});
