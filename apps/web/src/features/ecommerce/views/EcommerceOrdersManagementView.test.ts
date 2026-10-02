import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EcommerceOrdersManagementView from "./EcommerceOrdersManagementView.vue";

const { listManagedShopOrders, updateManagedShopOrderStatus, replace } = vi.hoisted(() => ({ listManagedShopOrders: vi.fn(), updateManagedShopOrderStatus: vi.fn(), replace: vi.fn() }));
const route = { query: { status: "paid", pagina: "2" } };
vi.mock("../api", () => ({ listManagedShopOrders, updateManagedShopOrderStatus }));
vi.mock("vue-router", () => ({ useRoute: () => route, useRouter: () => ({ replace }) }));

describe("gestión de pedidos ecommerce", () => {
  beforeEach(() => {
    listManagedShopOrders.mockResolvedValue({ items: [{ id: "order-1", status: "paid", totalCents: 24900, shippingAddress: { street: "Calle Uno", postalCode: "28001", city: "Madrid", province: "Madrid", country: "España" }, paymentProvider: "manual", paymentReference: null, createdAt: "2026-10-02T10:00:00.000Z", updatedAt: "2026-10-02T10:00:00.000Z", lines: [{ id: "line-1", productId: "product-1", titleSnapshot: "Consola revisada", quantity: 1, unitPriceCentsSnapshot: 24900 }] }], total: 26, page: 2, pageSize: 25 });
  });

  it("carga la página filtrada por estado desde la URL", async () => {
    const wrapper = mount(EcommerceOrdersManagementView, { global: { stubs: { AppPagination: true } } });
    await flushPromises();

    expect(listManagedShopOrders).toHaveBeenCalledWith({ status: "paid", pagina: 2, pageSize: 25 });
    expect(wrapper.text()).toContain("Consola revisada");
    expect(wrapper.text()).toContain("26");
  });
});
