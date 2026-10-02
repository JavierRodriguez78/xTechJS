import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerTradeInListView from "./CustomerTradeInListView.vue";

const { listCustomerTradeInRequests } = vi.hoisted(() => ({ listCustomerTradeInRequests: vi.fn() }));
vi.mock("../../customer-portal/session", () => ({ customerSession: { value: { accessToken: "customer-token" } }, signOutCustomer: vi.fn() }));
vi.mock("../api", () => ({ listCustomerTradeInRequests }));

describe("solicitudes de compraventa del cliente", () => {
  beforeEach(() => {
    listCustomerTradeInRequests.mockResolvedValue([{ id: "trade-in-1", customerId: "customer-1", deviceType: "console", brand: "Nintendo", model: "Switch", conditionDescription: "Buen estado", status: "proposal_sent", proposedAmountCents: 12500, proposalNote: "Incluye cargador", finalAmountCents: null, decidedAt: null, completedAt: null, createdAt: "2026-10-02T10:00:00.000Z", updatedAt: "2026-10-02T10:00:00.000Z" }]);
  });

  it("carga las solicitudes con el token de cliente", async () => {
    const wrapper = mount(CustomerTradeInListView, { global: { stubs: { RouterLink: true } } });
    await flushPromises();

    expect(listCustomerTradeInRequests).toHaveBeenCalledWith("customer-token");
    expect(wrapper.text()).toContain("Vender mi equipo");
  });
});
