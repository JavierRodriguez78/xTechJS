<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { listManagedTradeInRequests, type TradeInRequest, type TradeInStatus } from "../api";

const route = useRoute();
const router = useRouter();
const requests = ref<TradeInRequest[]>([]);
const loading = ref(true);
const error = ref("");
const status = ref<Exclude<TradeInStatus, "draft"> | "">("");
const statuses: { value: Exclude<TradeInStatus, "draft">; label: string }[] = [{ value: "submitted", label: "Enviadas" }, { value: "in_review", label: "En revisión" }, { value: "proposal_sent", label: "Propuesta enviada" }, { value: "accepted", label: "Aceptadas" }, { value: "rejected", label: "Rechazadas" }, { value: "completed", label: "Completadas" }, { value: "cancelled", label: "Canceladas" }];
const label = (value: TradeInStatus) => statuses.find((item) => item.value === value)?.label ?? "Borrador";
const hasStatusFilter = computed(() => Boolean(status.value));
async function load(): Promise<void> { loading.value = true; error.value = ""; try { requests.value = await listManagedTradeInRequests(status.value || undefined); } catch (reason) { error.value = (reason as Error).message; } finally { loading.value = false; } }
function replaceQuery(): void { void router.replace({ query: { status: status.value || undefined } }); }
watch(() => route.query, (next) => { status.value = String(next.status ?? "") as Exclude<TradeInStatus, "draft"> | ""; void load(); }, { immediate: true });
watch(status, replaceQuery);
</script>

<template>
  <section class="ecommerce-orders-view"><header><div><p class="eyebrow">Compraventa</p><h1>Valoraciones <span class="count">{{ requests.length }}</span></h1></div></header><div class="filter-bar"><select v-model="status"><option value="">Todos los estados</option><option v-for="item in statuses" :key="item.value" :value="item.value">{{ item.label }}</option></select><button v-if="hasStatusFilter" class="secondary" type="button" @click="status = ''">Limpiar filtro</button></div><p v-if="error" class="feedback error">{{ error }} <button class="secondary" type="button" @click="load">Reintentar</button></p><div v-else class="customer-list"><template v-if="loading"><div v-for="item in 6" :key="item" class="skeleton-row" /></template><template v-else><RouterLink v-for="request in requests" :key="request.id" class="ecommerce-product-row" :to="{ name: 'trade-in.detail', params: { id: request.id } }"><div><strong>{{ request.brand }} {{ request.model }}</strong><span>{{ request.deviceType }} · {{ new Date(request.createdAt).toLocaleDateString('es-ES') }}</span></div><span v-if="request.proposedAmountCents !== null">{{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(request.proposedAmountCents / 100) }}</span><span :class="['status-pill', request.status]">{{ label(request.status) }}</span></RouterLink></template><p v-if="!loading && !requests.length" class="empty">No hay solicitudes con este estado.</p></div></section>
</template>
