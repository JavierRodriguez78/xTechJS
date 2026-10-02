import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RepairCreateView from "./RepairCreateView.vue";

// `vi.mock` se eleva por encima del modulo, asi que sus dobles deben declararse
// con `vi.hoisted` para existir cuando la fabrica se ejecuta.
const { createRepair, getWorkflowConfig, listCustomers, listTechnicians, push, back } = vi.hoisted(() => ({
  createRepair: vi.fn(),
  getWorkflowConfig: vi.fn(),
  listCustomers: vi.fn(),
  listTechnicians: vi.fn(),
  push: vi.fn(),
  back: vi.fn()
}));

vi.mock("../api", () => ({ createRepair, getWorkflowConfig, listCustomers, listTechnicians }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push, back }) }));

async function mountView() {
  const wrapper = mount(RepairCreateView);
  await flushPromises();
  return wrapper;
}

describe("alta de reparacion", () => {
  beforeEach(() => {
    listCustomers.mockResolvedValue({ items: [{ id: "customer-1", displayName: "Ada Lovelace" }] });
    getWorkflowConfig.mockResolvedValue({ statuses: [], deviceTypes: ["Consola", "Dron"] });
    listTechnicians.mockResolvedValue([{ id: "technician-1", displayName: "Grace Hopper" }]);
    createRepair.mockResolvedValue({ id: "repair-1" });
  });

  it("ofrece los tipos de dispositivo configurados en lugar de texto libre", async () => {
    const wrapper = await mountView();

    expect(wrapper.findAll(".repair-type-card").map((card) => card.text())).toEqual(["CConsola", "DDron"]);
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Grace Hopper");
  });

  it("abre el panel de selección aunque el tipo no tenga marcas configuradas", async () => {
    const wrapper = await mountView();
    await wrapper.findAll(".repair-type-card").find((card) => card.text().includes("Dron"))!.trigger("click");
    expect(wrapper.find(".catalog-drawer").text()).toContain("No hay marcas configuradas para Dron.");
    expect(wrapper.find(".catalog-drawer").text()).toContain("Usar marca y modelo");
  });

  it("envia el tipo elegido y navega al detalle de la orden creada", async () => {
    const wrapper = await mountView();

    await wrapper.find(".intake-customer-option").trigger("click");
    await wrapper.findAll(".repair-type-card").find((card) => card.text().includes("Dron"))!.trigger("click");
    await wrapper.find('[data-test="brand"]').setValue("DJI");
    await wrapper.find('[data-test="model"]').setValue("Mini");
    await wrapper.find('[data-test="reported-issue"]').setValue("No despega");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(createRepair).toHaveBeenCalledWith(expect.objectContaining({ customerId: "customer-1", deviceType: "Dron", brand: "DJI", model: "Mini", reportedIssue: "No despega" }));
    expect(push).toHaveBeenCalledWith({ name: "repairs.detail.general", params: { id: "repair-1" } });
  });

  it("abre los tickets del cliente seleccionado", async () => {
    const wrapper = await mountView();
    await wrapper.find(".intake-customer-option").trigger("click");
    await wrapper.findAll("button").find((button) => button.text() === "Ver tickets")!.trigger("click");
    expect(push).toHaveBeenCalledWith({ name: "repairs.list", query: { cliente: "customer-1" } });
  });

  it("incluye un presupuesto inicial cuando se añade una linea", async () => {
    const wrapper = await mountView();
    await wrapper.findAll("button").find((button) => button.text() === "Añadir línea")!.trigger("click");
    const inputs = wrapper.find(".quote-line").findAll("input");
    await inputs[0].setValue("Diagnostico");
    await inputs[1].setValue("1");
    await inputs[2].setValue("2500");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(createRepair).toHaveBeenCalledWith(expect.objectContaining({ initialQuoteLines: [{ description: "Diagnostico", quantity: 1, unitPriceCents: 2500 }] }));
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
