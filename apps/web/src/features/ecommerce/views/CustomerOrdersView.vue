<script setup lang="ts">
import { onMounted, ref } from "vue";
import { customerSession, signOutCustomer } from "../../customer-portal/session";
import { listCustomerShopOrders, type ShopOrder } from "../api";

const orders = ref<ShopOrder[]>([]);
const loading = ref(true);
const error = ref("");
const statusLabels: Record<ShopOrder["status"], string> = { pending_payment: "Pendiente de pago", paid: "Pagado", preparing: "En preparación", shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado", refunded: "Reembolsado" };
const money = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
const date = (value: string) => new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

async function load(): Promise<void> {
  if (!customerSession.value) return;
  loading.value = true;
  error.value = "";
  try {
    orders.value = await listCustomerShopOrders(customerSession.value.accessToken);
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <main class="customer-orders-page"><header class="customer-orders-header"><div><p class="eyebrow">Tienda</p><h1>Mis pedidos</h1></div><nav><RouterLink :to="{ name: 'customer.portal' }">Reparaciones</RouterLink><RouterLink :to="{ name: 'shop.catalog' }">Tienda</RouterLink><button class="secondary" type="button" @click="signOutCustomer">Salir</button></nav></header>
    <p v-if="loading" class="empty">Cargando pedidos...</p><p v-else-if="error" class="feedback error">{{ error }} <button class="secondary" type="button" @click="load">Reintentar</button></p>
    <section v-else-if="!orders.length" class="customer-orders-empty"><p class="empty">Aún no tienes pedidos de tienda.</p><RouterLink class="button-link" :to="{ name: 'shop.catalog' }">Explorar catálogo</RouterLink></section>
    <section v-else class="customer-order-list"><RouterLink v-for="order in orders" :key="order.id" class="customer-order-row" :to="{ name: 'customer.order', params: { id: order.id } }"><div><p class="eyebrow">Pedido {{ order.id.slice(0, 8) }}</p><strong>{{ order.lines.map((line) => line.titleSnapshot).join(", ") }}</strong><span>{{ date(order.createdAt) }} · {{ order.lines.length }} líneas</span></div><strong>{{ money(order.totalCents) }}</strong><span :class="['status-pill', order.status]">{{ statusLabels[order.status] }}</span></RouterLink></section>
  </main>
</template>
