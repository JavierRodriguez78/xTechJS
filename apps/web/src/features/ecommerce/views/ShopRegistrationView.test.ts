import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShopRegistrationView from "./ShopRegistrationView.vue";

afterEach(() => vi.unstubAllGlobals());

describe("registro publico de tienda", () => {
  it("solicita la verificación solo con el email y muestra una respuesta genérica", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = mount(ShopRegistrationView, { global: { stubs: { RouterLink: { props: ["to"], template: '<a :data-route="to.name"><slot /></a>' } } } });
    await wrapper.find('input[autocomplete="email"]').setValue("ada@example.test");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/api/shop/register/request", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "ada@example.test" })
    }));
    expect(wrapper.text()).toContain("Si el correo puede registrarse");
    expect(wrapper.text()).not.toContain("Cuenta creada");
  });
});
