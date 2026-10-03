import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SupplierCatalogTab from "./SupplierCatalogTab.vue";

const state = vi.hoisted(() => ({
  listSupplierCatalog: vi.fn(),
  replace: vi.fn(),
  route: { params: { id: "supplier-1" }, query: {} as Record<string, string> }
}));
vi.mock("../../api", () => ({ listSupplierCatalog: state.listSupplierCatalog }));
vi.mock("vue-router", () => ({ useRoute: () => state.route, useRouter: () => ({ replace: state.replace }) }));

const paginationStub = {
  emits: ["change", "pageSizeChange"],
  template: "<nav><button @click=\"$emit('change', 2)\">Siguiente</button><button @click=\"$emit('pageSizeChange', 50)\">50</button></nav>"
};

describe("catalogo de proveedor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.route.query = {};
    state.listSupplierCatalog.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
  });

  it("consulta por paginas y sincroniza los controles con la URL", async () => {
    const wrapper = mount(SupplierCatalogTab, { global: { stubs: { AppPagination: paginationStub, RouterLink: true } } });
    await flushPromises();
    expect(state.listSupplierCatalog).toHaveBeenCalledWith({ supplierId: "supplier-1", pagina: 1, pageSize: 25 });
    await wrapper.findAll("button")[0].trigger("click");
    expect(state.replace).toHaveBeenLastCalledWith({ query: { pagina: "2" } });
    await wrapper.findAll("button")[1].trigger("click");
    expect(state.replace).toHaveBeenLastCalledWith({ query: { pageSize: "50", pagina: undefined } });
  });
});
