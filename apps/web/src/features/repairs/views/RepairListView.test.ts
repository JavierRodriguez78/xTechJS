import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RepairListView from "./RepairListView.vue";

const { getWorkflowConfig, listCustomers, listRepairs, listTechnicians, replace } = vi.hoisted(() => ({
  getWorkflowConfig: vi.fn(),
  listCustomers: vi.fn(),
  listRepairs: vi.fn(),
  listTechnicians: vi.fn(),
  replace: vi.fn()
}));
const route = { query: { q: "sony", estado: "repairing", tecnico: "tech-1", tipo: "Consola", cliente: "customer-1", desde: "2026-01-01", hasta: "2026-01-31", pagina: "2" } };

vi.mock("../api", () => ({ getWorkflowConfig, listCustomers, listRepairs, listTechnicians }));
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ replace }) }));
vi.mock("../../chat/notifications", () => ({ chatUnreadByRepair: {} }));

describe("listado de reparaciones", () => {
  beforeEach(() => {
    listRepairs.mockResolvedValue({ items: [{ id: "repair-1", customerId: "customer-1", brand: "Sony", model: "PS5", deviceType: "Consola", serialNumber: null, reportedIssue: "No enciende", deliveredAccessories: null, technicianId: "tech-1", diagnosis: null, status: "repairing", createdAt: "2026-01-02" }], total: 26, page: 2, pageSize: 25 });
    getWorkflowConfig.mockResolvedValue({ statuses: ["repairing"], deviceTypes: ["Consola"] });
    listTechnicians.mockResolvedValue([{ id: "tech-1", displayName: "Ada" }]);
    listCustomers.mockResolvedValue({ items: [{ id: "customer-1", displayName: "Ada Lovelace" }] });
  });

  it("carga los filtros de URL y muestra el total remoto", async () => {
    const wrapper = mount(RepairListView, { global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } } });
    await flushPromises();

    expect(listRepairs).toHaveBeenCalledWith(expect.objectContaining({ q: "sony", estado: "repairing", tecnico: "tech-1", tipo: "Consola", cliente: "customer-1", desde: "2026-01-01", hasta: "2026-01-31", pagina: 2, pageSize: 25, orden: "createdAt:desc" }));
    expect(wrapper.find("h1").text()).toContain("26");
    expect(wrapper.text()).toContain("Sony PS5");
  });
});
