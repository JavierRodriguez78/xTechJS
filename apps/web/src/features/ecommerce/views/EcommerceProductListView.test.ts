import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EcommerceProductListView from "./EcommerceProductListView.vue";

const { listManagedShopProducts, replace } = vi.hoisted(() => ({ listManagedShopProducts: vi.fn(), replace: vi.fn() }));
const route = { query: { q: "switch", category: "console", published: "true", pagina: "2" } };
vi.mock("../api", () => ({ listManagedShopProducts }));
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ replace }) }));

describe("gestión de catálogo ecommerce", () => {
  beforeEach(() => {
    listManagedShopProducts.mockResolvedValue({ items: [{ id: "product-1", sku: "SWITCH-001", title: "Nintendo Switch", description: "Revisada", category: "console", condition: "used_good", priceCents: 24900, stockQuantity: 3, published: true, createdAt: "2026-10-02T10:00:00.000Z", updatedAt: "2026-10-02T10:00:00.000Z" }], total: 26, page: 2, pageSize: 25 });
  });

  it("carga la página filtrada desde la URL", async () => {
    const wrapper = mount(EcommerceProductListView, { global: { stubs: { AppPagination: true, RouterLink: true } } });
    await flushPromises();

    expect(listManagedShopProducts).toHaveBeenCalledWith({ q: "switch", category: "console", published: true, pagina: 2, pageSize: 25 });
    expect(wrapper.text()).toContain("26");
  });
});
