import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerListView from "./CustomerListView.vue";

const { listCustomers, replace } = vi.hoisted(() => ({ listCustomers: vi.fn(), replace: vi.fn() }));
const route = { query: { q: "ana", estado: "pending", pagina: "2" } };

vi.mock("../api", () => ({ listCustomers }));
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ replace }) }));

describe("listado de clientes", () => {
  beforeEach(() => {
    listCustomers.mockResolvedValue({
      items: [{ id: "customer-1", displayName: "Ana Ruiz", email: "ana@example.test", phone: null, taxId: null, tags: ["empresa"], registrationStatus: "pending" }],
      total: 26,
      page: 2,
      pageSize: 25
    });
  });

  it("carga la página filtrada indicada en la URL y muestra el total remoto", async () => {
    const wrapper = mount(CustomerListView, { global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } } });
    await flushPromises();

    expect(listCustomers).toHaveBeenCalledWith(expect.objectContaining({ q: "ana", estado: "pending", pagina: 2, pageSize: 25, orden: "createdAt:desc" }));
    expect(wrapper.find("h1").text()).toContain("26");
    expect(wrapper.text()).toContain("Ana Ruiz");
  });
});