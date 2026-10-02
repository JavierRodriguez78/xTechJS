import { beforeEach, describe, expect, it } from "vitest";
import { addToCart, cartLines, clearCart, updateCartQuantity } from "./cart";
import type { ShopProduct } from "./api";

const product: ShopProduct = { id: "product-1", sku: "SKU-1", title: "Consola", description: "Revisada", category: "console", condition: "refurbished", priceCents: 24900, currency: "EUR", stockQuantity: 2, published: true, createdAt: "2026-10-02", updatedAt: "2026-10-02" };

describe("carrito de tienda", () => {
  beforeEach(() => clearCart());

  it("acumula unidades sin superar el stock y persiste la línea", () => {
    addToCart(product);
    addToCart(product);
    addToCart(product);

    expect(cartLines.value).toEqual([expect.objectContaining({ productId: product.id, quantity: 2, maxQuantity: 2 })]);
    expect(sessionStorage.getItem("xtechjs.shop-cart")).toContain("product-1");
  });

  it("elimina la línea cuando su cantidad pasa a cero", () => {
    addToCart(product);
    updateCartQuantity(product.id, 0);

    expect(cartLines.value).toEqual([]);
  });
});
