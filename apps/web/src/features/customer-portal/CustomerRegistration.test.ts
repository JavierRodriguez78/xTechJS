import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import CustomerRegistration from "./CustomerRegistration.vue";

afterEach(() => vi.unstubAllGlobals());

describe("autorregistro por invitación", () => {
  it("precarga los datos de CRM y los conserva al completar contraseña y consentimiento", async () => {
    window.history.replaceState({}, "", "/customer/register?token=staff-token");
    const profile = {
      customerId: "customer-1", email: "ada@example.test", displayName: "Ada Cliente", phone: "600123123", taxId: null, customerType: "individual",
      address: null, addressStreet: "Calle Uno 1", addressPostalCode: "28001", addressCity: "Madrid", addressProvince: "Madrid", addressCountry: "España",
      billingName: "Ada Cliente", billingTaxId: "X1234567A", billingAddressStreet: "Calle Fiscal 2", billingAddressPostalCode: "28002", billingAddressCity: "Madrid", billingAddressProvince: "Madrid", billingAddressCountry: "España"
    };
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => init
      ? { ok: true, json: async () => ({ message: "ok" }) }
      : { ok: true, json: async () => profile });
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = mount(CustomerRegistration, { global: { stubs: { RouterLink: true, AddressFields: true } } });
    await flushPromises();

    const billingName = wrapper.findAll("input").find((input) => (input.element as HTMLInputElement).value === "Ada Cliente");
    expect(billingName?.attributes("readonly")).toBeDefined();
    await wrapper.find('input[type="password"]').setValue("clave-de-prueba-larga-123");
    await wrapper.findAll('input[type="password"]')[1].setValue("clave-de-prueba-larga-123");
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[checkboxes.length - 1].setValue(true);
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/customers/register/staff-token");
    const submitted = JSON.parse(String(fetchMock.mock.calls[1][1].body)) as Record<string, unknown>;
    expect(submitted.billingName).toBe("Ada Cliente");
    expect(submitted.billingTaxId).toBe("X1234567A");
    expect(submitted.billingAddressStreet).toBe("Calle Fiscal 2");
    expect(submitted.consentAccepted).toBe(true);
    expect(wrapper.text()).toContain("Registro completado correctamente");
  });
});
