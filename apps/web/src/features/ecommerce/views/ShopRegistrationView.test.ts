import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShopRegistrationView from "./ShopRegistrationView.vue";

const replace = vi.fn();
vi.mock("vue-router", () => ({ useRouter: () => ({ replace }) }));

afterEach(() => vi.unstubAllGlobals());

describe("registro publico de tienda", () => {
  it("registra la cuenta con consentimiento explicito y permite acceder", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = mount(ShopRegistrationView, { global: { stubs: { RouterLink: { props: ["to"], template: '<a :data-route="to.name"><slot /></a>' } } } });
    await wrapper.find('input[autocomplete="name"]').setValue("Ada Cliente");
    await wrapper.find('input[autocomplete="email"]').setValue("ada@example.test");
    await wrapper.find('input[autocomplete="tel"]').setValue("600123123");
    const passwords = wrapper.findAll('input[type="password"]');
    await passwords[0].setValue("una-clave-muy-segura-123");
    await passwords[1].setValue("una-clave-muy-segura-123");
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/api/shop/register", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"consentAccepted":true')
    }));
    expect(wrapper.text()).toContain("Tu cuenta está lista");
    expect(wrapper.find('a[data-route="customer.login"]').exists()).toBe(true);
  });
});
