<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { listPayments, refundPayment, type Payment } from "../api";

const payments = ref<Payment[]>([]);
const error = ref("");
const status = ref("");
const reasons = ref<Record<string, string>>({});
const rectifyingId = ref("");
const rectifiedIds = computed(() => new Set(payments.value.flatMap((payment) => payment.originalPaymentId ? [payment.originalPaymentId] : [])));
const filtered = computed(() => payments.value.filter((payment) => !status.value || payment.status === status.value));
const money = (payment: Payment) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format((payment.documentType === "rectification" ? -payment.amountCents : payment.amountCents) / 100);

async function load(): Promise<void> {
  try { payments.value = await listPayments(); } catch (reason) { error.value = (reason as Error).message; }
}

async function rectify(payment: Payment): Promise<void> {
  const reason = reasons.value[payment.id]?.trim();
  if (!reason) { error.value = "Indica el motivo de la rectificación."; return; }
  rectifyingId.value = payment.id;
  error.value = "";
  try {
    await refundPayment(payment.id, reason);
    delete reasons.value[payment.id];
    await load();
  } catch (cause) {
    error.value = (cause as Error).message;
  } finally {
    rectifyingId.value = "";
  }
}

onMounted(load);
</script>

<template>
  <section>
    <header><div><p class="eyebrow">TPV</p><h1>Facturas <span class="count">{{ filtered.length }}</span></h1></div><RouterLink class="button-link" :to="{ name: 'payments.create' }">Registrar cobro</RouterLink></header>
    <div class="filter-bar"><select v-model="status"><option value="">Todos los estados</option><option value="paid">Emitidas</option><option value="refunded">Rectificativas</option></select><RouterLink :to="{ name: 'payments.cash-register' }">Caja diaria</RouterLink><RouterLink :to="{ name: 'payments.reports' }">Informes</RouterLink></div>
    <p v-if="error" class="feedback error">{{ error }}</p>
    <div class="customer-list">
      <p v-if="!filtered.length" class="empty">No hay documentos registrados.</p>
      <div v-for="payment in filtered" v-else :key="payment.id" class="customer-row">
        <RouterLink :to="{ name: 'payments.detail', params: { id: payment.id } }"><strong>{{ money(payment) }}</strong></RouterLink>
        <span>{{ payment.documentType === "rectification" ? "Rectificativa" : payment.method }}</span>
        <span>{{ new Date(payment.createdAt).toLocaleDateString("es-ES") }}</span>
        <template v-if="payment.documentType !== 'rectification' && !rectifiedIds.has(payment.id)">
          <input v-model="reasons[payment.id]" maxlength="500" placeholder="Motivo de rectificación" aria-label="Motivo de rectificación" />
          <button class="secondary" :disabled="rectifyingId === payment.id" @click="rectify(payment)">{{ rectifyingId === payment.id ? "Emitiendo" : "Rectificar" }}</button>
        </template>
        <span v-else-if="rectifiedIds.has(payment.id)" class="status-pill">Rectificada</span>
        <span v-else class="status-pill">Serie R</span>
      </div>
    </div>
  </section>
</template>