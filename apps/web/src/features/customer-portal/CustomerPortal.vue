<script setup lang="ts">
import { onMounted, ref } from "vue";
import { customerSession, signOutCustomer } from "./session";

interface Repair { id: string; deviceType: string; brand: string; model: string; reportedIssue: string; status: string; }
interface Quote { totalCents: number; status: "draft" | "sent" | "approved" | "rejected"; lines: { description: string; quantity: number; unitPriceCents: number }[]; }
const repairs = ref<Repair[]>([]);
const quotes = ref<Record<string, Quote>>({});
const loading = ref(true);
const message = ref("");
const errorMessage = ref("");
function money(cents: number): string { return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100); }
function headers(): HeadersInit { return { authorization: `Bearer ${customerSession.value?.accessToken ?? ""}` }; }
async function load(): Promise<void> {
  loading.value = true; errorMessage.value = "";
  try {
    const response = await fetch("/api/customer/repairs", { headers: headers() });
    if (!response.ok) throw new Error("No se pudieron cargar tus reparaciones.");
    repairs.value = await response.json() as Repair[];
    await Promise.all(repairs.value.map(async (repair) => {
      const quoteResponse = await fetch(`/api/customer/repairs/${repair.id}/quote`, { headers: headers() });
      if (quoteResponse.ok) quotes.value[repair.id] = await quoteResponse.json() as Quote;
    }));
  } catch (error) { errorMessage.value = (error as Error).message; }
  finally { loading.value = false; }
}
async function approve(repairId: string): Promise<void> {
  const response = await fetch(`/api/customer/repairs/${repairId}/quote/approve`, { method: "POST", headers: headers() });
  if (!response.ok) { errorMessage.value = "No se pudo aprobar el presupuesto."; return; }
  quotes.value[repairId] = await response.json() as Quote;
  message.value = "Presupuesto aprobado correctamente.";
  await load();
}
onMounted(load);
</script>

<template>
  <main class="customer-portal">
    <header class="customer-portal-header"><div><p class="eyebrow">Portal de cliente</p><h1>Hola, {{ customerSession?.user.displayName }}</h1></div><button type="button" class="secondary" @click="signOutCustomer">Salir</button></header>
    <p v-if="message" class="feedback success">{{ message }}</p><p v-if="errorMessage" class="feedback error">{{ errorMessage }}</p>
    <p v-if="loading" class="empty">Cargando tus reparaciones...</p>
    <section v-else class="customer-portal-repairs"><p v-if="!repairs.length" class="empty">No tienes reparaciones registradas.</p><article v-for="repair in repairs" :key="repair.id" class="customer-portal-repair"><div><p class="eyebrow">{{ repair.status }}</p><h2>{{ repair.brand }} {{ repair.model }}</h2><p>{{ repair.deviceType }} · {{ repair.reportedIssue }}</p></div><div v-if="quotes[repair.id]" class="customer-portal-quote"><strong>{{ money(quotes[repair.id].totalCents) }}</strong><span>{{ quotes[repair.id].status }}</span><button v-if="quotes[repair.id].status === 'sent'" type="button" @click="approve(repair.id)">Aprobar presupuesto</button></div></article></section>
  </main>
</template>
