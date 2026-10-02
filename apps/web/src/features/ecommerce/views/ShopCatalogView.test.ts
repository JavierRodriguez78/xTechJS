import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ShopCatalogView from "./ShopCatalogView.vue";

const { listShopProducts, replace } = vi.hoisted(() => ({ listShopProducts: vi.fn(), replace: vi.fn() }));
const route = { query: { q: "switch", category: "console", pagina: "2" } };

vi.mock("../api", () => ({ listShopProducts }));
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ replace }) }));

describe("catálogo público", () => {
  beforeEach(() => {
    listShopProducts.mockResolvedValue({
      items: [{ id: "product-1", sku: "SW-001", title: "Consola revisada", description: "Lista para jugar", category: "console", condition: "refurbished", priceCents: 24900, currency: "EUR", stockQuantity: 1, published: true, createdAt: "2026-10-02", updatedAt: "2026-10-02" }],
      total: 26,
      page: 2,
      pageSize: 25
    });
  });

  it("carga la página pública filtrada por la URL y muestra el producto", async () => {
    const wrapper = mount(ShopCatalogView, { global: { stubs: { RouterLink: { template: "<a><slot /></a>" }, AppPagination: true } } });
    await flushPromises();

    expect(listShopProducts).toHaveBeenCalledWith(expect.objectContaining({ q: "switch", category: "console", pagina: 2, pageSize: 25 }));
    expect(wrapper.text()).toContain("Consola revisada");
    expect(wrapper.text()).toContain("249,00");
  });
});
