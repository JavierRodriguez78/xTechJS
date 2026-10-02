<script setup lang="ts">
import { cartItemCount, cartLines, cartTotalCents, removeFromCart, updateCartQuantity } from "../cart";

const money = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
</script>

<template>
  <main class="shop-page">
    <header class="shop-header"><RouterLink class="shop-brand" :to="{ name: 'shop.catalog' }">xTech<span>JS</span> tienda</RouterLink><div class="shop-actions"><RouterLink :to="{ name: 'shop.catalog' }">Seguir comprando</RouterLink><RouterLink class="shop-sign-in" :to="{ name: 'customer.login' }">Acceder</RouterLink></div></header>
    <section class="shop-cart-page"><div><p class="eyebrow">Carrito</p><h1>{{ cartItemCount ? "Tu selección" : "Tu carrito está vacío" }}</h1></div>
      <p v-if="!cartLines.length" class="empty">Explora el catálogo para añadir productos disponibles.</p>
      <div v-else class="shop-cart-layout"><ul class="shop-cart-lines"><li v-for="line in cartLines" :key="line.productId"><div><strong>{{ line.title }}</strong><span>{{ money(line.priceCents) }} por unidad</span></div><label>Cantidad <input :value="line.quantity" type="number" min="1" :max="line.maxQuantity" @change="updateCartQuantity(line.productId, Number(($event.target as HTMLInputElement).value))" /></label><strong>{{ money(line.quantity * line.priceCents) }}</strong><button class="secondary" type="button" @click="removeFromCart(line.productId)">Quitar</button></li></ul><aside class="shop-cart-summary"><p class="eyebrow">Resumen</p><strong>{{ money(cartTotalCents) }}</strong><span>{{ cartItemCount }} artículos</span><RouterLink class="button-link" :to="{ name: 'shop.checkout' }">Continuar al pago</RouterLink></aside></div>
    </section>
  </main>
</template>
