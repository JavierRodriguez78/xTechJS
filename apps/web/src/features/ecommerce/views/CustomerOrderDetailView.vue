<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { customerSession } from "../../customer-portal/session";
import { downloadCustomerShopInvoice, getCustomerShopOrder, type ShopOrder } from "../api";

const route = useRoute();
const order = ref<ShopOrder | null>(null);
const error = ref("");
const statusLabels: Record<ShopOrder["status"], string> = { pending_payment: "Pendiente de pago", paid: "Pagado", preparing: "En preparación", shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado", refunded: "Reembolsado" };
const money = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
const date = (value: string) => new Date(value).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });

onMounted(async () => {
  if (!customerSession.value) return;
  try {
    order.value = await getCustomerShopOrder(customerSession.value.accessToken, String(route.params.id));
  } catch (reason) {
    error.value = (reason as Error).message;
  }
});

async function downloadInvoice(): Promise<void> {
  if (!customerSession.value || !order.value) return;
  try {
    const url = URL.createObjectURL(await downloadCustomerShopInvoice(customerSession.value.accessToken, order.value.id));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `factura-${order.value.id.slice(0, 8)}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (reason) {
    error.value = (reason as Error).message;
  }
}
</script>

<template>
  <main class="customer-orders-page"><p class="shop-back"><RouterLink :to="{ name: 'customer.orders' }">Volver a mis pedidos</RouterLink></p><p v-if="!order && !error" class="empty">Cargando pedido...</p><p v-else-if="error" class="feedback error">{{ error }}</p>
    <section v-else-if="order" class="customer-order-detail"><header><div><p class="eyebrow">Pedido {{ order.id.slice(0, 8) }}</p><h1>{{ statusLabels[order.status] }}</h1><p>{{ date(order.createdAt) }}</p></div><div><strong>{{ money(order.totalCents) }}</strong><button v-if="order.status === 'paid'" class="secondary" type="button" @click="downloadInvoice">Descargar factura</button></div></header><div class="customer-order-detail-grid"><section><h2>Productos</h2><ul><li v-for="line in order.lines" :key="line.id"><span>{{ line.titleSnapshot }} <small>{{ line.quantity }} × {{ money(line.unitPriceCentsSnapshot) }}</small></span><strong>{{ money(line.quantity * line.unitPriceCentsSnapshot) }}</strong></li></ul></section><section><h2>Entrega</h2><p>{{ order.shippingAddress.street }}<br />{{ order.shippingAddress.postalCode }} {{ order.shippingAddress.city }}<br />{{ order.shippingAddress.province }}, {{ order.shippingAddress.country }}</p><p v-if="order.paymentReference"><strong>Referencia de pago:</strong> {{ order.paymentReference }}</p><p v-else class="empty">El pago se coordinará manualmente con el laboratorio.</p></section></div></section>
  </main>
</template>
