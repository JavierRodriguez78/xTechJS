<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { customerSession, signOutCustomer } from "./session";

interface Repair {
  id: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber?: string | null;
  reportedIssue: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  diagnosis?: string | null;
}

interface Quote {
  totalCents: number;
  status: "draft" | "sent" | "approved" | "rejected";
  lines: { description: string; quantity: number; unitPriceCents: number }[];
}
interface Invoice { receiptNumber: string; issuedAt: string; payment: { id: string; amountCents: number; status: string }; }

const repairs = ref<Repair[]>([]);
const quotes = ref<Record<string, Quote>>({});
const invoices = ref<Record<string, Invoice[]>>({});
const loading = ref(true);
const message = ref("");
const errorMessage = ref("");
const selectedRepairId = ref<string>("");

const selectedRepair = computed(() => repairs.value.find((repair) => repair.id === selectedRepairId.value) ?? repairs.value[0] ?? null);
const selectedQuote = computed(() => selectedRepair.value ? quotes.value[selectedRepair.value.id] : undefined);

function money(cents: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: "Recibido",
    diagnosed: "En diagnóstico",
    quoted: "Presupuestado",
    approved: "Aprobado",
    in_repair: "En reparación",
    testing: "En pruebas",
    repaired: "Reparado",
    delivered: "Entregado",
    unrecoverable: "No reparable",
    cancelled: "Cancelado"
  };
  return labels[status] ?? status;
}

function statusTone(status: string): string {
  const tones: Record<string, string> = {
    received: "neutral",
    diagnosed: "amber",
    quoted: "amber",
    approved: "blue",
    in_repair: "blue",
    testing: "blue",
    repaired: "green",
    delivered: "green",
    unrecoverable: "danger",
    cancelled: "danger"
  };
  return tones[status] ?? "neutral";
}

function formatDate(value?: string): string {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function headers(): HeadersInit {
  return { authorization: `Bearer ${customerSession.value?.accessToken ?? ""}` };
}

async function load(): Promise<void> {
  loading.value = true;
  errorMessage.value = "";
  message.value = "";

  try {
    const response = await fetch("/api/customer/repairs", { headers: headers() });
    if (!response.ok) throw new Error("No se pudieron cargar tus reparaciones.");

    repairs.value = (await response.json()) as Repair[];
    if (!repairs.value.length) {
      selectedRepairId.value = "";
      return;
    }

    if (!selectedRepairId.value || !repairs.value.some((repair) => repair.id === selectedRepairId.value)) {
      selectedRepairId.value = repairs.value[0].id;
    }

    const quoteMap: Record<string, Quote> = {};
    const invoiceMap: Record<string, Invoice[]> = {};
    await Promise.all(repairs.value.map(async (repair) => {
      const quoteResponse = await fetch(`/api/customer/repairs/${repair.id}/quote`, { headers: headers() });
      if (quoteResponse.ok) {
        quoteMap[repair.id] = (await quoteResponse.json()) as Quote;
      }
      const invoiceResponse = await fetch(`/api/customer/repairs/${repair.id}/invoices`, { headers: headers() });
      if (invoiceResponse.ok) invoiceMap[repair.id] = await invoiceResponse.json() as Invoice[];
    }));
    quotes.value = quoteMap;
    invoices.value = invoiceMap;
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    loading.value = false;
  }
}

async function downloadInvoice(repairId: string, paymentId: string, receiptNumber: string): Promise<void> {
  const response = await fetch(`/api/customer/repairs/${repairId}/invoices/${paymentId}/pdf`, { headers: headers() });
  if (!response.ok) { errorMessage.value = "No se pudo descargar la factura."; return; }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `factura-${receiptNumber}.pdf`; anchor.click(); URL.revokeObjectURL(url);
}

async function approve(repairId: string): Promise<void> {
  const response = await fetch(`/api/customer/repairs/${repairId}/quote/approve`, { method: "POST", headers: headers() });
  if (!response.ok) {
    errorMessage.value = "No se pudo aprobar el presupuesto.";
    return;
  }

  const updatedQuote = (await response.json()) as Quote;
  quotes.value[repairId] = updatedQuote;
  message.value = "Presupuesto aprobado correctamente.";
  await load();
}

onMounted(load);
</script>

<template>
  <main class="customer-portal">
    <header class="customer-portal-header">
      <div>
        <p class="eyebrow">Portal de cliente</p>
        <h1>Hola, {{ customerSession?.user.displayName }}</h1>
      </div>
      <button type="button" class="secondary" @click="signOutCustomer">Salir</button>
    </header>

    <p v-if="message" class="feedback success">{{ message }}</p>
    <p v-if="errorMessage" class="feedback error">{{ errorMessage }}</p>
    <p v-if="loading" class="empty">Cargando tus reparaciones...</p>

    <section v-else-if="!repairs.length" class="customer-portal-empty">
      <p class="empty">No tienes reparaciones registradas.</p>
    </section>

    <section v-else class="customer-portal-layout">
      <aside class="customer-portal-list">
        <div class="customer-portal-summary">
          <article class="metric green">
            <span>Reparaciones</span>
            <strong>{{ repairs.length }}</strong>
          </article>
          <article class="metric amber">
            <span>En curso</span>
            <strong>{{ repairs.filter((repair) => repair.status !== "delivered" && repair.status !== "cancelled").length }}</strong>
          </article>
        </div>

        <article
          v-for="repair in repairs"
          :key="repair.id"
          :class="['customer-portal-repair', { active: selectedRepair?.id === repair.id }]"
          @click="selectedRepairId = repair.id"
        >
          <div class="customer-portal-repair-main">
            <p class="eyebrow">{{ statusLabel(repair.status) }}</p>
            <h2>{{ repair.brand }} {{ repair.model }}</h2>
            <p>{{ repair.deviceType }} · {{ repair.reportedIssue }}</p>
          </div>
          <div class="customer-portal-repair-meta">
            <span>{{ formatDate(repair.createdAt) }}</span>
            <span :class="['status-pill', statusTone(repair.status)]">{{ statusLabel(repair.status) }}</span>
          </div>
        </article>
      </aside>

      <article v-if="selectedRepair" class="customer-portal-detail">
        <div class="customer-portal-detail-header">
          <div>
            <p class="eyebrow">Resumen</p>
            <h2>{{ selectedRepair.brand }} {{ selectedRepair.model }}</h2>
          </div>
          <span :class="['status-pill', statusTone(selectedRepair.status)]">{{ statusLabel(selectedRepair.status) }}</span>
        </div>

        <div class="customer-portal-detail-grid">
          <div>
            <p><strong>Tipo:</strong> {{ selectedRepair.deviceType }}</p>
            <p><strong>Serie:</strong> {{ selectedRepair.serialNumber || "No indicada" }}</p>
            <p><strong>Fecha:</strong> {{ formatDate(selectedRepair.createdAt) }}</p>
          </div>
          <div>
            <p><strong>Avería:</strong> {{ selectedRepair.reportedIssue }}</p>
            <p v-if="selectedRepair.diagnosis"><strong>Diagnóstico:</strong> {{ selectedRepair.diagnosis }}</p>
          </div>
        </div>

        <div v-if="selectedQuote" class="quote-card">
          <div class="quote-card-header">
            <div>
              <p class="eyebrow">Presupuesto</p>
              <strong>{{ money(selectedQuote.totalCents) }}</strong>
            </div>
            <span :class="['status-pill', selectedQuote.status === 'approved' ? 'green' : 'amber']">
              {{ selectedQuote.status === 'approved' ? 'Aprobado' : selectedQuote.status === 'sent' ? 'Pendiente' : selectedQuote.status }}
            </span>
          </div>

          <ul class="quote-lines">
            <li v-for="line in selectedQuote.lines" :key="`${selectedRepair.id}-${line.description}`">
              <span>{{ line.description }}</span>
              <em>{{ line.quantity }} × {{ money(line.unitPriceCents) }}</em>
            </li>
          </ul>

          <button v-if="selectedQuote.status === 'sent'" type="button" @click="approve(selectedRepair.id)">Aprobar presupuesto</button>
        </div>

        <div v-else class="quote-card empty-quote">
          <p class="eyebrow">Presupuesto</p>
          <p>Aún no hay un presupuesto asociado a esta reparación.</p>
        </div>
        <div class="quote-card" v-if="invoices[selectedRepair.id]?.length">
          <p class="eyebrow">Facturas</p>
          <ul class="quote-lines"><li v-for="invoice in invoices[selectedRepair.id]" :key="invoice.payment.id"><span>{{ invoice.receiptNumber }} - {{ money(invoice.payment.amountCents) }}</span><button type="button" class="secondary" @click="downloadInvoice(selectedRepair.id, invoice.payment.id, invoice.receiptNumber)">Descargar factura</button></li></ul>
        </div>
      </article>
    </section>
  </main>
</template>
