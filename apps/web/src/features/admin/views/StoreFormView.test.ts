import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StoreFormView from "./StoreFormView.vue";

const api = vi.hoisted(() => ({ createStore: vi.fn(), listStores: vi.fn(), updateStore: vi.fn(), listAddressCountries: vi.fn(), listAddressProvinces: vi.fn(), listAddressPlaces: vi.fn(), push: vi.fn() }));
const route = { params: {} as Record<string, string> };
vi.mock("../api", () => api);
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ push: api.push }) }));

describe("ficha de tiendas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params = {};
    api.listAddressCountries.mockResolvedValue([{ code: "ES", name: "España", postalCoverage: true }, { code: "FR", name: "Francia", postalCoverage: false }]);
    api.listAddressProvinces.mockResolvedValue([{ code: "M", name: "Madrid" }, { code: "V", name: "Valencia" }]);
    api.listAddressPlaces.mockResolvedValue([{ city: "Madrid", postalCode: "28001" }, { city: "Madrid", postalCode: "28002" }]);
    api.createStore.mockResolvedValue({ id: "store-1" });
  });

  it("selecciona una direccion y guarda campos opcionales vacios", async () => {
    const wrapper = mount(StoreFormView, { global: { stubs: { RouterLink: true } } });
    await flushPromises();
    await wrapper.findAll("select")[1].setValue("M");
    await flushPromises();
    await wrapper.findAll("select")[2].setValue("Madrid");
    expect(wrapper.findAll("select")[3].element.value).toBe("");
    await wrapper.findAll("select")[3].setValue("28002");
    await wrapper.findAll("input")[0].setValue("Taller Madrid");
    await wrapper.findAll("input")[1].setValue("MAD-");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(api.createStore).toHaveBeenCalledWith(expect.objectContaining({ addressCountry: "España", addressProvince: "Madrid", addressCity: "Madrid", addressPostalCode: "28002", email: "", logoUrl: "" }));
    expect(api.push).toHaveBeenCalledWith({ name: "admin.stores.list" });
  });

  it("limpia poblacion y codigo al cambiar provincia y bloquea paises sin cobertura", async () => {
    const wrapper = mount(StoreFormView, { global: { stubs: { RouterLink: true } } });
    await flushPromises();
    await wrapper.findAll("select")[1].setValue("M");
    await flushPromises();
    await wrapper.findAll("select")[2].setValue("Madrid");
    await wrapper.findAll("select")[3].setValue("28001");
    await wrapper.findAll("select")[1].setValue("V");
    await flushPromises();
    expect(wrapper.findAll("select")[2].element.value).toBe("");
    expect(wrapper.findAll("select")[3].element.value).toBe("");
    await wrapper.findAll("select")[0].setValue("FR");
    await flushPromises();
    expect(wrapper.find("footer button").attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("El catalogo postal disponible cubre Espana.");
  });

  it("carga la direccion existente para editar sin sustituirla", async () => {
    route.params = { id: "store-1" };
    api.listStores.mockResolvedValue([{ id: "store-1", name: "Madrid", addressCountry: "España", addressProvince: "Madrid", addressCity: "Madrid", addressPostalCode: "28002", addressStreet: "Calle Uno", invoiceSeriesPrefix: "MAD-" }]);
    const wrapper = mount(StoreFormView, { global: { stubs: { RouterLink: true } } });
    await flushPromises();
    expect(wrapper.findAll("select")[1].element.value).toBe("M");
    expect(wrapper.findAll("select")[2].element.value).toBe("Madrid");
    expect(wrapper.findAll("select")[3].element.value).toBe("28002");
    expect(wrapper.findAll("input")[0].element.value).toBe("Madrid");
  });
});