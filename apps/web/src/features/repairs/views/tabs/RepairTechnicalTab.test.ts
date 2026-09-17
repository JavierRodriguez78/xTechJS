import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Repair } from "../../api";
import RepairTechnicalTab from "./RepairTechnicalTab.vue";

// `vi.mock` se eleva por encima del modulo, asi que sus dobles deben declararse
// con `vi.hoisted` para existir cuando la fabrica se ejecuta.
const { getWorkflowConfig, listTechnicians, updateStatus, updateTechnical } = vi.hoisted(() => ({
  getWorkflowConfig: vi.fn(),
  listTechnicians: vi.fn(),
  updateStatus: vi.fn(),
  updateTechnical: vi.fn()
}));

vi.mock("../../api", () => ({ getWorkflowConfig, listTechnicians, updateStatus, updateTechnical }));

function repair(status = "received"): Repair {
  return {
    id: "repair-1",
    customerId: "customer-1",
    deviceType: "Consola",
    brand: "Sony",
    model: "PS5",
    serialNumber: null,
    reportedIssue: "No enciende",
    deliveredAccessories: null,
    technicianId: null,
    diagnosis: null,
    status,
    createdAt: "2026-09-17T09:00:00.000Z"
  };
}

async function mountTab(status = "received") {
  const current = ref<Repair | null>(repair(status));
  const wrapper = mount(RepairTechnicalTab, { global: { provide: { repair: current } } });
  await flushPromises();
  return { wrapper, current };
}

describe("pestaña de diagnostico tecnico", () => {
  beforeEach(() => {
    listTechnicians.mockResolvedValue([]);
    getWorkflowConfig.mockResolvedValue({ statuses: ["received", "diagnosing", "awaiting-parts"], deviceTypes: [] });
    updateStatus.mockImplementation(async (_id: string, status: string) => repair(status));
  });

  it("ofrece los estados configurados y no una lista fija en el cliente", async () => {
    const { wrapper } = await mountTab();

    const options = wrapper.findAll("select")[0].findAll("option");
    expect(options.map((option) => option.attributes("value"))).toEqual(["received", "diagnosing", "awaiting-parts"]);
    expect(options.map((option) => option.text())).toEqual(["Recibido", "En diagnóstico", "Awaiting parts"]);
  });

  it("guarda el estado personalizado que elige el tecnico", async () => {
    const { wrapper, current } = await mountTab();

    await wrapper.findAll("select")[0].setValue("awaiting-parts");
    await flushPromises();

    expect(updateStatus).toHaveBeenCalledWith("repair-1", "awaiting-parts");
    expect(current.value?.status).toBe("awaiting-parts");
  });

  it("muestra el motivo del rechazo y devuelve el select al estado real", async () => {
    updateStatus.mockRejectedValueOnce(new Error('El estado "entregado" no esta configurado.'));
    const { wrapper, current } = await mountTab();

    const select = wrapper.findAll("select")[0];
    await select.setValue("diagnosing");
    await flushPromises();

    expect(wrapper.find(".feedback.error").text()).toBe('El estado "entregado" no esta configurado.');
    expect((select.element as HTMLSelectElement).value).toBe("received");
    expect(current.value?.status).toBe("received");
  });

  it("informa cuando no puede cargar la configuracion del taller", async () => {
    getWorkflowConfig.mockRejectedValueOnce(new Error("No se pudo completar la operacion."));
    const { wrapper } = await mountTab();

    expect(wrapper.find(".feedback.error").text()).toBe("No se pudo completar la operacion.");
    expect(wrapper.findAll("select")[0].findAll("option")).toHaveLength(0);
  });
});
