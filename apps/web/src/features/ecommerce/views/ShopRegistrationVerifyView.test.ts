import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShopRegistrationVerifyView from "./ShopRegistrationVerifyView.vue";

afterEach(() => vi.unstubAllGlobals());

describe("verificación del correo de tienda", () => {
  it("valida el token y ofrece continuar al formulario final", async () => {
    window.history.replaceState({}, "", "/shop/register/verify?token=verified-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ email: "ada@example.test" }) });
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = mount(ShopRegistrationVerifyView, { global: { stubs: { RouterLink: { props: ["to"], template: '<a :data-route="to.name" :data-token="to.query?.token"><slot /></a>' } } } });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/api/shop/register/verify/verified-token");
    expect(wrapper.text()).toContain("ada@example.test");
    expect(wrapper.find('a[data-route="shop.register.complete"][data-token="verified-token"]').exists()).toBe(true);
  });
});
