<script setup lang="ts">
import { onMounted, ref } from "vue";
import { customerSession, signOutCustomer } from "../../customer-portal/session";
import { listCustomerTradeInRequests, type TradeInRequest, type TradeInStatus } from "../api";

const requests = ref<TradeInRequest[]>([]);
const loading = ref(true);
const error = ref("");
const statusLabels: Record<TradeInStatus, string> = { draft: "Borrador", submitted: "Enviada", in_review: "En revisión", proposal_sent: "Propuesta recibida", accepted: "Aceptada", rejected: "Rechazada", completed: "Completada", cancelled: "Cancelada" };
const date = (value: string) => new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
async function load(): Promise<void> { if (!customerSession.value) return; loading.value = true; error.value = ""; try { requests.value = await listCustomerTradeInRequests(customerSession.value.accessToken); } catch (reason) { error.value = (reason as Error).message; } finally { loading.value = false; } }
onMounted(load);
</script>

<template>
  <main class="customer-orders-page"><header class="customer-orders-header"><div><p class="eyebrow">Compraventa</p><h1>Vender mi equipo</h1></div><nav><RouterLink :to="{ name: 'customer.portal' }">Reparaciones</RouterLink><RouterLink :to="{ name: 'customer.orders' }">Pedidos</RouterLink><RouterLink :to="{ name: 'shop.catalog' }">Tienda</RouterLink><button class="secondary" type="button" @click="signOutCustomer">Salir</button></nav></header>
    <p v-if="loading" class="empty">Cargando solicitudes...</p><p v-else-if="error" class="feedback error">{{ error }} <button class="secondary" type="button" @click="load">Reintentar</button></p>
    <section v-else-if="!requests.length" class="customer-orders-empty"><p class="empty">Aún no has enviado ningún equipo para valoración.</p><RouterLink class="button-link" :to="{ name: 'customer.trade-in.create' }">Solicitar valoración</RouterLink></section>
    <section v-else class="customer-order-list"><RouterLink class="button-link" :to="{ name: 'customer.trade-in.create' }">Nueva solicitud</RouterLink><RouterLink v-for="request in requests" :key="request.id" class="customer-order-row" :to="{ name: 'customer.trade-in.detail', params: { id: request.id } }"><div><p class="eyebrow">{{ request.deviceType }}</p><strong>{{ request.brand }} {{ request.model }}</strong><span>{{ date(request.createdAt) }}</span></div><strong v-if="request.proposedAmountCents !== null">{{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(request.proposedAmountCents / 100) }}</strong><span :class="['status-pill', request.status]">{{ statusLabels[request.status] }}</span></RouterLink></section>
  </main>
</template>
