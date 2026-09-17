import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RepairCreateView from "./RepairCreateView.vue";

// `vi.mock` se eleva por encima del modulo, asi que sus dobles deben declararse
// con `vi.hoisted` para existir cuando la fabrica se ejecuta.
const { createRepair, getWorkflowConfig, listCustomers, push, back } = vi.hoisted(() => ({
  createRepair: vi.fn(),
  getWorkflowConfig: vi.fn(),
  listCustomers: vi.fn(),
  push: vi.fn(),
  back: vi.fn()
}));

vi.mock("../api", () => ({ createRepair, getWorkflowConfig, listCustomers }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push, back }) }));

async function mountView() {
  const wrapper = mount(RepairCreateView);
  await flushPromises();
  return wrapper;
}

describe("alta de reparacion", () => {
  beforeEach(() => {
    listCustomers.mockResolvedValue([{ id: "customer-1", displayName: "Ada Lovelace" }]);
    getWorkflowConfig.mockResolvedValue({ statuses: [], deviceTypes: ["Consola", "Dron"] });
    createRepair.mockResolvedValue({ id: "repair-1" });
  });

  it("ofrece los tipos de dispositivo configurados en lugar de texto libre", async () => {
    const wrapper = await mountView();

    const deviceSelect = wrapper.findAll("select")[1];
    expect(deviceSelect.findAll("option").map((option) => option.text())).toEqual(["Selecciona un tipo", "Consola", "Dron"]);
    // Marca, modelo, numero de serie y accesorios siguen siendo texto libre.
    expect(wrapper.findAll("input")).toHaveLength(4);
  });

  it("envia el tipo elegido y navega al detalle de la orden creada", async () => {
    const wrapper = await mountView();

    await wrapper.findAll("select")[0].setValue("customer-1");
    await wrapper.findAll("select")[1].setValue("Dron");
    await wrapper.findAll("input")[0].setValue("DJI");
    await wrapper.findAll("input")[1].setValue("Mini");
    await wrapper.find("textarea").setValue("No despega");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(createRepair).toHaveBeenCalledWith(expect.objectContaining({ customerId: "customer-1", deviceType: "Dron", brand: "DJI", model: "Mini", reportedIssue: "No despega" }));
    expect(push).toHaveBeenCalledWith({ name: "repairs.detail.general", params: { id: "repair-1" } });
  });

  it("muestra el rechazo del servidor si el tipo deja de estar configurado", async () => {
    createRepair.mockRejectedValueOnce(new Error('El tipo de dispositivo "Dron" no esta configurado.'));
    const wrapper = await mountView();

    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.find(".feedback.error").text()).toBe('El tipo de dispositivo "Dron" no esta configurado.');
    expect(push).not.toHaveBeenCalled();
  });
});
