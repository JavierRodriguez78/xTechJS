import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShopRegistrationCompleteView from "./ShopRegistrationCompleteView.vue";

vi.mock("vue-router", () => ({ useRoute: () => ({ query: { token: "verified-token" } }) }));
afterEach(() => vi.unstubAllGlobals());

describe("finalización del autorregistro", () => {
  it("crea la cuenta solo después de validar el token y aceptar el consentimiento", async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => init
      ? { ok: true, json: async () => ({}) }
      : { ok: true, json: async () => ({ email: "ada@example.test" }) });
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = mount(ShopRegistrationCompleteView, { global: { stubs: { RouterLink: { props: ["to"], template: '<a :data-route="to.name"><slot /></a>' }, AddressFields: true } } });
    await flushPromises();

    await wrapper.find('input[autocomplete="name"]').setValue("Ada Cliente");
    const passwords = wrapper.findAll('input[type="password"]');
    await passwords[0].setValue("clave-de-prueba-larga-123");
    await passwords[1].setValue("clave-de-prueba-larga-123");
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/shop/register/verify/verified-token");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/shop/register/verify/verified-token", expect.objectContaining({ method: "POST", body: expect.stringContaining('"consentAccepted":true') }));
    expect(wrapper.text()).toContain("Tu correo ada@example.test está verificado");
  });
});
