<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { staffSession } from "../../../auth/session";

interface Payment { id: string; amountCents: number; method: string; status: string; documentType?: "invoice" | "rectification"; createdAt: string; }
const route = useRoute();
const payments = ref<Payment[]>([]);
const error = ref("");
const money = (value: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value / 100);

onMounted(async () => {
  const response = await fetch(`/api/payments/repair/${route.params.id}`, { headers: { authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` } });
  if (!response.ok) { error.value = "No se pudieron cargar los cobros de esta reparacion."; return; }
  payments.value = await response.json() as Payment[];
});
</script>
<template><section class="detail-tab"><h2>Documentos asociados</h2><p v-if="error" class="feedback error">{{ error }}</p><ul v-else class="customer-repair-items"><li v-for="payment in payments" :key="payment.id"><RouterLink :to="{ name: 'payments.detail', params: { id: payment.id } }"><strong>{{ money(payment.documentType === "rectification" ? -payment.amountCents : payment.amountCents) }}</strong></RouterLink><span>{{ payment.documentType === "rectification" ? "Factura rectificativa" : `Factura - ${payment.method}` }}</span><em>{{ new Date(payment.createdAt).toLocaleString("es-ES") }}</em></li></ul><p v-if="!error && !payments.length" class="empty">No hay documentos asociados a esta reparacion.</p></section></template>