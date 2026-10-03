import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import SupplierCatalogListView from "./SupplierCatalogListView.vue";

const { listSupplierCatalog, listSuppliers, replace } = vi.hoisted(() => ({ listSupplierCatalog: vi.fn(), listSuppliers: vi.fn(), replace: vi.fn() }));
const route = { query: { q: "pantalla", availability: "in_stock", pagina: "2" } };
vi.mock("../api", () => ({ listSupplierCatalog, listSuppliers }));
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ replace }) }));

describe("listado del catálogo externo", () => {
  it("aplica filtros de URL y enlaza cada repuesto a su ficha", async () => {
    listSupplierCatalog.mockResolvedValue({
      items: [{ id: "catalog-1", supplierId: "supplier-1", externalRef: "SKU-12", name: "Pantalla iPhone 12", category: "pantalla", brand: "Apple", compatibleModels: ["iPhone 12"], sku: "P-12", priceCents: 4590, currency: "EUR", availability: "in_stock", url: "https://parts.example/p/12", capturedAt: "2026-10-03T10:00:00Z", inventoryItemId: null, createdAt: "2026-10-03T10:00:00Z", updatedAt: "2026-10-03T10:00:00Z" }], total: 1, page: 2, pageSize: 25
    });
    listSuppliers.mockResolvedValue([{ id: "supplier-1", name: "Parts Example", email: null, phone: null, notes: null, externalRef: "parts.example", website: null }]);
    const wrapper = mount(SupplierCatalogListView, { global: { stubs: { RouterLink: { props: ["to"], template: '<a :data-route="to.name"><slot /></a>' }, AppPagination: true } } });
    await flushPromises();

    expect(listSupplierCatalog).toHaveBeenCalledWith(expect.objectContaining({ q: "pantalla", availability: "in_stock", pagina: 2, pageSize: 25 }));
    expect(wrapper.find("table").exists()).toBe(true);
    expect(wrapper.text()).toContain("Parts Example");
    expect(wrapper.text()).toContain("45,90");
    expect(wrapper.find('a[data-route="inventory.catalog.detail"]').exists()).toBe(true);
  });
});
