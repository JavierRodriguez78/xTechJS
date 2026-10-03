import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import CustomerRepairListView from "./CustomerRepairListView.vue";

vi.mock("./session", () => ({ customerSession: { value: { accessToken: "customer-token" } } }));

afterEach(() => vi.unstubAllGlobals());

describe("lista de reparaciones del cliente", () => {
  it("muestra una tabla y ofrece acceso al detalle propio", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: "repair-1", deviceType: "Consola", brand: "Nintendo", model: "Switch", reportedIssue: "No carga", status: "repairing", createdAt: "2026-10-02T00:00:00.000Z" }] });
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = mount(CustomerRepairListView, { global: { stubs: { RouterLink: { props: ["to"], template: '<a :data-route="to.name"><slot /></a>' } } } });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/api/customer/repairs", { headers: { authorization: "Bearer customer-token" } });
    expect(wrapper.find("table").exists()).toBe(true);
    expect(wrapper.text()).toContain("Nintendo Switch");
    expect(wrapper.text()).toContain("En reparación");
    expect(wrapper.findAll('a[data-route="customer.repair.detail"]')).toHaveLength(2);
  });
});
