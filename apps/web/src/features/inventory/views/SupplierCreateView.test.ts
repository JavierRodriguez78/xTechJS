import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SupplierCreateView from "./SupplierCreateView.vue";

const api = vi.hoisted(() => ({ createSupplier: vi.fn(), push: vi.fn() }));
vi.mock("../api", async (importOriginal) => ({ ...await importOriginal<typeof import("../api")>(), ...api }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: api.push }) }));

describe("alta de proveedor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.createSupplier.mockResolvedValue({ id: "supplier-1" });
  });

  it("presenta un formulario completo y abre la ficha tras guardar", async () => {
    const wrapper = mount(SupplierCreateView, { global: { stubs: { AddressFields: { props: ["legend"], template: "<fieldset><legend>{{ legend }}</legend></fieldset>" }, RouterLink: true } } });
    expect(wrapper.text()).toContain("Identificacion y contacto");
    expect(wrapper.text()).toContain("Direccion fiscal");
    expect(wrapper.text()).toContain("Condiciones comerciales");
    expect(wrapper.text()).toContain("NIF / CIF");
    expect(wrapper.text()).toContain("Telefono secundario");
    expect(wrapper.text()).toContain("Plazo de pago (dias)");
    await wrapper.find("input[required]").setValue("Proveedor Ejemplo");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(api.createSupplier).toHaveBeenCalledWith(expect.objectContaining({
      name: "Proveedor Ejemplo",
      legalName: null,
      taxId: null,
      addressStreet: null,
      addressPostalCode: null,
      addressCity: null,
      addressProvince: null,
      addressCountry: null,
      paymentTermDays: null,
      category: null,
      website: null
    }));
    expect(api.push).toHaveBeenCalledWith({ name: "suppliers.detail.general", params: { id: "supplier-1" } });
  });
});
