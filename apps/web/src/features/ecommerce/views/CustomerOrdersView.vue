<script setup lang="ts">
import { onMounted, ref } from "vue";
import { customerSession } from "../../customer-portal/session";
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
  <section class="customer-view"><header class="customer-view-header"><div><p class="eyebrow">Tienda</p><h1>Mis pedidos</h1></div><RouterLink class="button-link" :to="{ name: 'shop.catalog' }">Explorar tienda</RouterLink></header>
    <p v-if="loading" class="empty" aria-live="polite">Cargando pedidos...</p><p v-else-if="error" class="feedback error" role="alert">{{ error }} <button class="secondary" type="button" @click="load">Reintentar</button></p>
    <section v-else-if="!orders.length" class="customer-table-empty"><p class="empty">Aún no tienes pedidos de tienda.</p></section>
    <div v-else class="customer-table-wrap"><table class="customer-data-table"><thead><tr><th scope="col">Pedido</th><th scope="col">Artículos</th><th scope="col">Fecha</th><th scope="col">Total</th><th scope="col">Estado</th><th scope="col"><span class="visually-hidden">Acción</span></th></tr></thead><tbody><tr v-for="order in orders" :key="order.id"><th scope="row"><RouterLink :to="{ name: 'customer.order', params: { id: order.id } }">{{ order.id.slice(0, 8) }}</RouterLink></th><td>{{ order.lines.map((line) => line.titleSnapshot).join(", ") }}</td><td>{{ date(order.createdAt) }}</td><td>{{ money(order.totalCents) }}</td><td><span :class="['status-pill', order.status]">{{ statusLabels[order.status] }}</span></td><td><RouterLink class="customer-table-action" :to="{ name: 'customer.order', params: { id: order.id } }">Ver pedido</RouterLink></td></tr></tbody></table></div>
  </section>
</template>
