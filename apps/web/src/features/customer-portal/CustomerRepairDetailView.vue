<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import AttachmentsPanel from "../attachments/AttachmentsPanel.vue";
import ChatPanel from "../chat/ChatPanel.vue";
import { customerSession } from "./session";
import { repairStatusLabel, repairStatusTone } from "../repairs/status-labels";

interface Repair {
  id: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber?: string | null;
  reportedIssue: string;
  status: string;
  createdAt: string;
  diagnosis?: string | null;
}
interface Quote { totalCents: number; status: "draft" | "sent" | "approved" | "rejected"; lines: { description: string; quantity: number; unitPriceCents: number }[]; }
interface Invoice { receiptNumber: string; payment: { id: string; amountCents: number; documentType?: "invoice" | "rectification" }; }
interface RepairStep { id: string; sequence: number; title: string; description: string | null; performedAt: string; }

const route = useRoute();
const repair = ref<Repair | null>(null);
const quote = ref<Quote | null>(null);
const invoices = ref<Invoice[]>([]);
const steps = ref<RepairStep[]>([]);
const loading = ref(true);
const error = ref("");
const message = ref("");
const money = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
const date = (value: string) => new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
const headers = (): HeadersInit => ({ authorization: `Bearer ${customerSession.value?.accessToken ?? ""}` });
const repairId = () => String(route.params.id);

async function load(): Promise<void> {
  if (!customerSession.value) return;
  loading.value = true;
  error.value = "";
  try {
    const response = await fetch("/api/customer/repairs", { headers: headers() });
    if (!response.ok) throw new Error("No se pudo cargar la reparación.");
    repair.value = ((await response.json()) as Repair[]).find((item) => item.id === repairId()) ?? null;
    if (!repair.value) throw new Error("No se encontró la reparación solicitada.");
    const [quoteResponse, invoiceResponse, stepsResponse] = await Promise.all([
      fetch(`/api/customer/repairs/${repairId()}/quote`, { headers: headers() }),
      fetch(`/api/customer/repairs/${repairId()}/invoices`, { headers: headers() }),
      fetch(`/api/customer/repairs/${repairId()}/steps`, { headers: headers() })
    ]);
    quote.value = quoteResponse.ok ? await quoteResponse.json() as Quote : null;
    invoices.value = invoiceResponse.ok ? await invoiceResponse.json() as Invoice[] : [];
    steps.value = stepsResponse.ok ? await stepsResponse.json() as RepairStep[] : [];
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
}

async function downloadInvoice(invoice: Invoice): Promise<void> {
  const response = await fetch(`/api/customer/repairs/${repairId()}/invoices/${invoice.payment.id}/pdf`, { headers: headers() });
  if (!response.ok) { error.value = "No se pudo descargar la factura."; return; }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `factura-${invoice.receiptNumber}.pdf`; anchor.click(); URL.revokeObjectURL(url);
}

async function downloadReport(): Promise<void> {
  const response = await fetch(`/api/customer/repairs/${repairId()}/report`, { headers: headers() });
  if (!response.ok) { error.value = "No se pudo descargar el informe técnico."; return; }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `informe-tecnico-${repairId().slice(0, 8)}.pdf`; anchor.click(); URL.revokeObjectURL(url);
}

async function approve(): Promise<void> {
  const response = await fetch(`/api/customer/repairs/${repairId()}/quote/approve`, { method: "POST", headers: headers() });
  if (!response.ok) { error.value = "No se pudo aprobar el presupuesto."; return; }
  quote.value = await response.json() as Quote;
  message.value = "Presupuesto aprobado correctamente.";
}

watch(() => route.params.id, load, { immediate: true });
</script>

<template>
  <section class="customer-view">
    <p class="customer-breadcrumb"><RouterLink :to="{ name: 'customer.portal' }">Reparaciones</RouterLink><span aria-hidden="true">/</span><span>Detalle</span></p>
    <p v-if="loading" class="empty" aria-live="polite">Cargando reparación...</p>
    <p v-else-if="error && !repair" class="feedback error" role="alert">{{ error }}</p>
    <article v-else-if="repair" class="customer-repair-detail">
      <header class="customer-view-header"><div><p class="eyebrow">{{ repair.deviceType }} · {{ date(repair.createdAt) }}</p><h1>{{ repair.brand }} {{ repair.model }}</h1></div><span :class="['status-pill', repairStatusTone(repair.status)]">{{ repairStatusLabel(repair.status) }}</span></header>
      <p v-if="message" class="feedback success" role="status">{{ message }}</p><p v-if="error" class="feedback error" role="alert">{{ error }}</p>
      <dl class="customer-repair-facts"><div><dt>Número de serie</dt><dd>{{ repair.serialNumber || "No indicado" }}</dd></div><div><dt>Avería comunicada</dt><dd>{{ repair.reportedIssue }}</dd></div><div v-if="repair.diagnosis"><dt>Diagnóstico</dt><dd>{{ repair.diagnosis }}</dd></div></dl>
      <section class="customer-detail-section"><div class="customer-detail-heading"><div><p class="eyebrow">Presupuesto</p><h2>{{ quote ? money(quote.totalCents) : "Sin presupuesto" }}</h2></div><span v-if="quote" :class="['status-pill', quote.status === 'approved' ? 'green' : 'amber']">{{ quote.status === 'approved' ? 'Aprobado' : quote.status === 'sent' ? 'Pendiente' : quote.status }}</span></div>
        <template v-if="quote"><ul class="quote-lines"><li v-for="line in quote.lines" :key="line.description"><span>{{ line.description }}</span><em>{{ line.quantity }} × {{ money(line.unitPriceCents) }}</em></li></ul><button v-if="quote.status === 'sent'" type="button" @click="approve">Aprobar presupuesto</button></template><p v-else class="empty">Aún no hay un presupuesto asociado a esta reparación.</p>
      </section>
      <section v-if="invoices.length" class="customer-detail-section"><p class="eyebrow">Facturas</p><ul class="quote-lines"><li v-for="invoice in invoices" :key="invoice.payment.id"><span>{{ invoice.receiptNumber }} · {{ money(invoice.payment.documentType === "rectification" ? -invoice.payment.amountCents : invoice.payment.amountCents) }}</span><button class="secondary" type="button" @click="downloadInvoice(invoice)">Descargar {{ invoice.payment.documentType === "rectification" ? "rectificativa" : "factura" }}</button></li></ul></section>
      <section class="customer-detail-section"><div class="customer-detail-heading"><div><p class="eyebrow">Pasos técnicos</p><h2>Trabajo realizado</h2></div><button class="secondary" type="button" @click="downloadReport">Descargar informe</button></div><ol v-if="steps.length" class="quote-lines"><li v-for="step in steps" :key="step.id"><span>{{ step.sequence }}. {{ step.title }}<small v-if="step.description"> · {{ step.description }}</small></span><em>{{ date(step.performedAt) }}</em></li></ol><p v-else class="empty">Todavía no hay pasos técnicos registrados.</p></section>
      <section class="customer-detail-section"><p class="eyebrow">Fotos y vídeos</p><AttachmentsPanel :key="repair.id" :repair-id="repair.id" :token="customerSession?.accessToken ?? ''" :can-manage="false" mode="customer" /></section>
      <section class="customer-detail-section"><p class="eyebrow">Mensajes</p><ChatPanel :key="repair.id" :repair-id="repair.id" :token="customerSession?.accessToken ?? ''" :current-sender-id="customerSession?.user.id" mode="customer" /></section>
    </article>
  </section>
</template>
