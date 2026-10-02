import { computed, ref } from "vue";
import type { ShopProduct } from "./api";

export interface CartLine {
  productId: string;
  title: string;
  priceCents: number;
  quantity: number;
  maxQuantity: number;
}

const storageKey = "xtechjs.shop-cart";
function readCart(): CartLine[] {
  try {
    const value = sessionStorage.getItem(storageKey);
    return value ? JSON.parse(value) as CartLine[] : [];
  } catch {
    sessionStorage.removeItem(storageKey);
    return [];
  }
}

export const cartLines = ref<CartLine[]>(readCart());
export const cartItemCount = computed(() => cartLines.value.reduce((total, line) => total + line.quantity, 0));
export const cartTotalCents = computed(() => cartLines.value.reduce((total, line) => total + line.priceCents * line.quantity, 0));

function persist(): void {
  sessionStorage.setItem(storageKey, JSON.stringify(cartLines.value));
}

export function addToCart(product: ShopProduct): void {
  const existing = cartLines.value.find((line) => line.productId === product.id);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + 1, product.stockQuantity);
    existing.maxQuantity = product.stockQuantity;
  } else {
    cartLines.value.push({ productId: product.id, title: product.title, priceCents: product.priceCents, quantity: 1, maxQuantity: product.stockQuantity });
  }
  persist();
}

export function updateCartQuantity(productId: string, quantity: number): void {
  const line = cartLines.value.find((item) => item.productId === productId);
  if (!line) return;
  if (quantity <= 0) {
    cartLines.value = cartLines.value.filter((item) => item.productId !== productId);
  } else {
    line.quantity = Math.min(Math.floor(quantity), line.maxQuantity);
  }
  persist();
}

export function removeFromCart(productId: string): void {
  cartLines.value = cartLines.value.filter((line) => line.productId !== productId);
  persist();
}

export function clearCart(): void {
  cartLines.value = [];
  persist();
}
