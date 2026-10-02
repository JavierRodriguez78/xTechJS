import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TradeInManagementView from "./TradeInManagementView.vue";

const { listManagedTradeInRequests, replace } = vi.hoisted(() => ({ listManagedTradeInRequests: vi.fn(), replace: vi.fn() }));
const route = { query: { status: "submitted" } };
vi.mock("../api", () => ({ listManagedTradeInRequests }));
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ replace }) }));

describe("gestión de compraventa", () => {
  beforeEach(() => {
    listManagedTradeInRequests.mockResolvedValue([{ id: "trade-in-1", customerId: "customer-1", deviceType: "console", brand: "Nintendo", model: "Switch", conditionDescription: "Buen estado", status: "submitted", proposedAmountCents: null, proposalNote: null, finalAmountCents: null, decidedAt: null, completedAt: null, createdAt: "2026-10-02T10:00:00.000Z", updatedAt: "2026-10-02T10:00:00.000Z" }]);
  });

  it("carga el estado seleccionado desde la URL", async () => {
    const wrapper = mount(TradeInManagementView, { global: { stubs: { RouterLink: true } } });
    await flushPromises();

    expect(listManagedTradeInRequests).toHaveBeenCalledWith("submitted");
    expect(wrapper.text()).toContain("Valoraciones");
  });
});
