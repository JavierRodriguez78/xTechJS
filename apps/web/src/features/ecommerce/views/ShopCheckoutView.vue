<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { customerSession } from "../../customer-portal/session";
import { cartLines, cartTotalCents, clearCart } from "../cart";
import { placeShopOrder, type ShippingAddress } from "../api";

const router = useRouter();
const form = ref<ShippingAddress>({ street: "", postalCode: "", city: "", province: "", country: "España" });
const saving = ref(false);
const error = ref("");
const orderId = ref("");
const money = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);

onMounted(() => {
  if (!customerSession.value) void router.replace({ name: "customer.login", query: { redirect: "/shop/checkout" } });
});

async function submit(): Promise<void> {
  if (!customerSession.value || !cartLines.value.length) return;
  saving.value = true;
  error.value = "";
  try {
    const order = await placeShopOrder(customerSession.value.accessToken, { lines: cartLines.value.map(({ productId, quantity }) => ({ productId, quantity })), shippingAddress: form.value });
    orderId.value = order.id;
    clearCart();
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="shop-page"><header class="shop-header"><RouterLink class="shop-brand" :to="{ name: 'shop.catalog' }">xTech<span>JS</span> tienda</RouterLink><div class="shop-actions"><RouterLink :to="{ name: 'shop.cart' }">Carrito</RouterLink></div></header>
    <section class="shop-checkout"><p class="eyebrow">Checkout</p><h1>{{ orderId ? "Pedido registrado" : "Dirección de entrega" }}</h1>
      <p v-if="orderId" class="feedback success">Tu pedido {{ orderId.slice(0, 8) }} se ha registrado y queda pendiente de pago manual. Recibirás las instrucciones a través del laboratorio.</p>
      <p v-else-if="!cartLines.length" class="empty">No hay productos en tu carrito. <RouterLink :to="{ name: 'shop.catalog' }">Volver al catálogo</RouterLink></p>
      <form v-else class="shop-checkout-form" @submit.prevent="submit"><div class="shop-checkout-layout"><fieldset><legend>Entrega</legend><label>Dirección<input v-model="form.street" required maxlength="240" autocomplete="street-address" /></label><div class="shop-address-row"><label>Código postal<input v-model="form.postalCode" required maxlength="20" autocomplete="postal-code" /></label><label>Localidad<input v-model="form.city" required maxlength="120" autocomplete="address-level2" /></label></div><label>Provincia<input v-model="form.province" required maxlength="120" autocomplete="address-level1" /></label><label>País<input v-model="form.country" required maxlength="120" autocomplete="country-name" /></label></fieldset><aside class="shop-cart-summary"><p class="eyebrow">Total</p><strong>{{ money(cartTotalCents) }}</strong><span>{{ cartLines.length }} líneas de pedido</span><button :disabled="saving">{{ saving ? "Registrando pedido" : "Confirmar pedido" }}</button></aside></div><p v-if="error" class="feedback error">{{ error }}</p></form>
    </section>
  </main>
</template>
