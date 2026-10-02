import { describe, expect, it, vi } from "vitest";
import { downloadCustomerShopInvoice } from "./api";

describe("factura de pedido ecommerce", () => {
  it("descarga el PDF con el token del cliente", async () => {
    const blob = new Blob(["%PDF-test"], { type: "application/pdf" });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadCustomerShopInvoice("customer-token", "order-1");

    expect(result).toBe(blob);
    expect(fetchMock).toHaveBeenCalledWith("/api/customer/orders/order-1/invoice.pdf", { headers: { authorization: "Bearer customer-token" } });
  });
});
