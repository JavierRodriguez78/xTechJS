import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { customerSession } from "../../customer-portal/session";
import CustomerOrdersView from "./CustomerOrdersView.vue";

const { listCustomerShopOrders } = vi.hoisted(() => ({ listCustomerShopOrders: vi.fn() }));
vi.mock("../api", () => ({ listCustomerShopOrders }));

describe("pedidos de cliente", () => {
  beforeEach(() => {
    customerSession.value = { accessToken: "customer-token", user: { id: "customer-1", displayName: "Ana", email: "ana@example.test", role: "customer" } };
    listCustomerShopOrders.mockResolvedValue([{ id: "order-1", status: "pending_payment", totalCents: 24900, shippingAddress: { street: "Calle Uno", postalCode: "28001", city: "Madrid", province: "Madrid", country: "España" }, paymentProvider: "manual", paymentReference: null, createdAt: "2026-10-02T10:00:00.000Z", updatedAt: "2026-10-02T10:00:00.000Z", lines: [{ id: "line-1", productId: "product-1", titleSnapshot: "Consola revisada", quantity: 1, unitPriceCentsSnapshot: 24900 }] }]);
  });

  it("carga los pedidos propios con el token de cliente", async () => {
    const wrapper = mount(CustomerOrdersView, { global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } } });
    await flushPromises();

    expect(listCustomerShopOrders).toHaveBeenCalledWith("customer-token");
    expect(wrapper.text()).toContain("Consola revisada");
    expect(wrapper.text()).toContain("Pendiente de pago");
  });
});
