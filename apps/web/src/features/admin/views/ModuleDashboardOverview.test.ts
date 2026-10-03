import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import ModuleDashboardOverview from "./ModuleDashboardOverview.vue";
import { staffSession } from "../../auth/session";

const { listAccessibleStores, replace } = vi.hoisted(() => ({ listAccessibleStores: vi.fn(), replace: vi.fn() }));
const route = { query: {} as Record<string, string> };
vi.mock("../api", () => ({ listAccessibleStores }));
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ replace }) }));

afterEach(() => vi.unstubAllGlobals());

describe("dashboard de módulos", () => {
  it("mantiene el agregado global aunque el administrador tenga tienda por defecto", async () => {
    staffSession.value = { accessToken: "admin-token", user: { id: "admin-1", displayName: "Admin", email: "admin@example.test", role: "admin", storeId: "store-1", defaultStoreId: "store-1", storeAccess: null } };
    listAccessibleStores.mockResolvedValue([{ id: "store-1", name: "Centro", active: true }, { id: "store-2", name: "Norte", active: true }]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ repairsByStatus: [], technicians: [], total: 0, in_progress: 0, finished: 0, newCustomers: 0 }) });
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = mount(ModuleDashboardOverview, { props: { section: "attention" } });
    await flushPromises();

    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes("storeId="))).toBe(true);
    expect(wrapper.find('select option[value=""]').text()).toBe("Todas mis tiendas");
  });

  it("conserva la tienda predeterminada de un técnico y no muestra selector global", async () => {
    staffSession.value = { accessToken: "tech-token", user: { id: "tech-1", displayName: "Técnico", email: "tech@example.test", role: "technician", storeId: "store-1", defaultStoreId: "store-1", storeAccess: ["store-1"] } };
    listAccessibleStores.mockResolvedValue([{ id: "store-1", name: "Centro", active: true }]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ inventoryItems: 0, lowStock: 0, stockPositionsByStatus: [], movementsByType: [], purchaseOrdersByStatus: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = mount(ModuleDashboardOverview, { props: { section: "inventory" } });
    await flushPromises();

    expect(fetchMock.mock.calls[0][0]).toContain("storeId=store-1");
    expect(wrapper.find("select").exists()).toBe(false);
  });
});
