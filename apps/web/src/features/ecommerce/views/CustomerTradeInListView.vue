<script setup lang="ts">
import { onMounted, ref } from "vue";
import { customerSession } from "../../customer-portal/session";
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
  <section class="customer-view"><header class="customer-view-header"><div><p class="eyebrow">Compraventa</p><h1>Vender mi equipo</h1></div><RouterLink class="button-link" :to="{ name: 'customer.trade-in.create' }">Nueva solicitud</RouterLink></header>
    <p v-if="loading" class="empty" aria-live="polite">Cargando solicitudes...</p><p v-else-if="error" class="feedback error" role="alert">{{ error }} <button class="secondary" type="button" @click="load">Reintentar</button></p>
    <section v-else-if="!requests.length" class="customer-table-empty"><p class="empty">Aún no has enviado ningún equipo para valoración.</p></section>
    <div v-else class="customer-table-wrap"><table class="customer-data-table"><thead><tr><th scope="col">Equipo</th><th scope="col">Tipo</th><th scope="col">Fecha</th><th scope="col">Propuesta</th><th scope="col">Estado</th><th scope="col"><span class="visually-hidden">Acción</span></th></tr></thead><tbody><tr v-for="request in requests" :key="request.id"><th scope="row"><RouterLink :to="{ name: 'customer.trade-in.detail', params: { id: request.id } }">{{ request.brand }} {{ request.model }}</RouterLink></th><td>{{ request.deviceType }}</td><td>{{ date(request.createdAt) }}</td><td>{{ request.proposedAmountCents === null ? "Pendiente" : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(request.proposedAmountCents / 100) }}</td><td><span :class="['status-pill', request.status]">{{ statusLabels[request.status] }}</span></td><td><RouterLink class="customer-table-action" :to="{ name: 'customer.trade-in.detail', params: { id: request.id } }">Ver solicitud</RouterLink></td></tr></tbody></table></div>
  </section>
</template>
