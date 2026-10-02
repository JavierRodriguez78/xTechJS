<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { listPayments, listTpvSales, refundPayment, type Payment, type TpvSale } from "../api";

const payments = ref<Payment[]>([]);
const sales = ref<TpvSale[]>([]);
const error = ref("");
const status = ref("");
const source = ref("");
const reasons = ref<Record<string, string>>({});
const rectifyingId = ref("");
const rectifiedIds = computed(() => new Set(payments.value.flatMap((payment) => payment.originalPaymentId ? [payment.originalPaymentId] : [])));
const filtered = computed(() => sales.value.filter((sale) => (!status.value || sale.status === status.value) && (!source.value || sale.source === source.value)));
const money = (payment: Payment) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format((payment.documentType === "rectification" ? -payment.amountCents : payment.amountCents) / 100);
const saleMoney = (sale: TpvSale) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format((sale.source === "repair" && sale.status === "refunded" ? -sale.amountCents : sale.amountCents) / 100);

async function load(): Promise<void> {
  try { [payments.value, sales.value] = await Promise.all([listPayments(), listTpvSales()]); } catch (reason) { error.value = (reason as Error).message; }
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
    <div class="filter-bar"><select v-model="source"><option value="">Reparaciones y online</option><option value="repair">Reparaciones</option><option value="online">Ventas online</option></select><select v-model="status"><option value="">Todos los estados</option><option value="paid">Emitidas</option><option value="refunded">Reembolsadas o rectificativas</option></select><RouterLink :to="{ name: 'payments.cash-register' }">Caja diaria</RouterLink><RouterLink :to="{ name: 'payments.reports' }">Informes</RouterLink></div>
    <p v-if="error" class="feedback error">{{ error }}</p>
    <div class="customer-list">
      <p v-if="!filtered.length" class="empty">No hay documentos registrados.</p>
      <div v-for="sale in filtered" v-else :key="`${sale.source}-${sale.id}`" class="customer-row">
        <RouterLink v-if="sale.source === 'repair'" :to="{ name: 'payments.detail', params: { id: sale.id } }"><strong>{{ saleMoney(sale) }}</strong></RouterLink>
        <strong v-else>{{ saleMoney(sale) }}</strong>
        <span>{{ sale.source === "online" ? "Venta online" : sale.status === "refunded" ? "Rectificativa reparación" : `Reparación · ${sale.method}` }}</span>
        <span>{{ sale.invoiceNumber ? `${sale.invoiceSeries}-${sale.invoiceNumber}` : "Factura pendiente" }} · {{ new Date(sale.createdAt).toLocaleDateString("es-ES") }}</span>
        <template v-if="sale.source === 'repair' && sale.status === 'paid' && !rectifiedIds.has(sale.id)">
          <input v-model="reasons[sale.id]" maxlength="500" placeholder="Motivo de rectificación" aria-label="Motivo de rectificación" />
          <button class="secondary" :disabled="rectifyingId === sale.id" @click="rectify(payments.find((payment) => payment.id === sale.id)!)">{{ rectifyingId === sale.id ? "Emitiendo" : "Rectificar" }}</button>
        </template>
        <span v-else-if="sale.source === 'repair' && rectifiedIds.has(sale.id)" class="status-pill">Rectificada</span>
        <span v-else-if="sale.source === 'online'" class="status-pill">{{ sale.status === "refunded" ? "Reembolsada" : "Online" }}</span>
        <span v-else class="status-pill">Serie R</span>
      </div>
    </div>
  </section>
</template>