<script setup lang="ts">
import { onMounted, ref } from "vue";

interface Customer { id: string; displayName: string; }
interface Technician { id: string; displayName: string; }
interface Repair { id: string; customerId: string; deviceType: string; brand: string; model: string; reportedIssue: string; technicianId: string | null; diagnosis: string | null; status: string; }
interface QuoteLine { description: string; quantity: number; unitPriceCents: number; }
interface RepairQuote { id: string; repairOrderId: string; lines: QuoteLine[]; totalCents: number; status: "draft" | "sent" | "approved" | "rejected"; }

const props = defineProps<{ accessToken: string }>();
const customers = ref<Customer[]>([]);
const technicians = ref<Technician[]>([]);
const repairs = ref<Repair[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const form = ref({ customerId: "", deviceType: "", brand: "", model: "", serialNumber: "", reportedIssue: "", deliveredAccessories: "" });
const selectedRepairId = ref<string | null>(null);
const quote = ref<RepairQuote | null>(null);
const quoteForm = ref<{ lines: QuoteLine[] }>({ lines: [{ description: "", quantity: 1, unitPriceCents: 0 }] });

function headers(): HeadersInit { return { "content-type": "application/json", authorization: `Bearer ${props.accessToken}` }; }
function customerName(id: string): string { return customers.value.find((customer) => customer.id === id)?.displayName ?? "Cliente"; }
function money(cents: number): string { return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100); }
function quoteTotal(): number { return quoteForm.value.lines.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.unitPriceCents || 0), 0); }

async function loadData(): Promise<void> {
  loading.value = true; errorMessage.value = "";
  try {
    const [customersResponse, techniciansResponse, repairsResponse] = await Promise.all([fetch("/api/customers", { headers: headers() }), fetch("/api/technicians", { headers: headers() }), fetch("/api/repairs", { headers: headers() })]);
    if (!customersResponse.ok || !techniciansResponse.ok || !repairsResponse.ok) throw new Error("No se pudo cargar la actividad del taller.");
    customers.value = await customersResponse.json() as Customer[];
    technicians.value = await techniciansResponse.json() as Technician[];
    repairs.value = await repairsResponse.json() as Repair[];
  } catch (error) { errorMessage.value = (error as Error).message; }
  finally { loading.value = false; }
}

async function createRepair(): Promise<void> {
  successMessage.value = ""; errorMessage.value = "";
  const response = await fetch("/api/repairs", { method: "POST", headers: headers(), body: JSON.stringify(form.value) });
  if (!response.ok) { errorMessage.value = "No se pudo crear la orden. Revisa los datos y tus permisos."; return; }
  form.value = { customerId: "", deviceType: "", brand: "", model: "", serialNumber: "", reportedIssue: "", deliveredAccessories: "" };
  successMessage.value = "Orden de reparacion creada.";
  await loadData();
}

async function changeStatus(repair: Repair, event: Event): Promise<void> {
  const status = (event.target as HTMLSelectElement).value;
  const response = await fetch(`/api/repairs/${repair.id}/status`, { method: "PATCH", headers: headers(), body: JSON.stringify({ status }) });
  if (!response.ok) { errorMessage.value = "Ese cambio de estado no esta permitido en el flujo actual."; await loadData(); return; }
  await loadData();
}

async function saveTechnical(repair: Repair, form: { technicianId: string; diagnosis: string }): Promise<void> {
  errorMessage.value = "";
  const response = await fetch(`/api/repairs/${repair.id}/technical`, { method: "PATCH", headers: headers(), body: JSON.stringify({ technicianId: form.technicianId || undefined, diagnosis: form.diagnosis || undefined }) });
  if (!response.ok) { errorMessage.value = "No se pudieron guardar los datos tecnicos."; return; }
  successMessage.value = "Ficha tecnica actualizada.";
  await loadData();
}

async function selectQuote(repair: Repair): Promise<void> {
  selectedRepairId.value = repair.id; quote.value = null; errorMessage.value = "";
  const response = await fetch(`/api/repairs/${repair.id}/quote`, { headers: headers() });
  if (response.status === 404) { quoteForm.value = { lines: [{ description: "", quantity: 1, unitPriceCents: 0 }] }; return; }
  if (!response.ok) { errorMessage.value = "No se pudo cargar el presupuesto."; return; }
  quote.value = await response.json() as RepairQuote;
  quoteForm.value = { lines: quote.value.lines.map((line) => ({ ...line })) };
}

function addQuoteLine(): void { quoteForm.value.lines.push({ description: "", quantity: 1, unitPriceCents: 0 }); }
function removeQuoteLine(index: number): void { if (quoteForm.value.lines.length > 1) quoteForm.value.lines.splice(index, 1); }

async function saveQuote(status: "draft" | "sent"): Promise<void> {
  if (!selectedRepairId.value) return;
  errorMessage.value = ""; successMessage.value = "";
  const response = await fetch(`/api/repairs/${selectedRepairId.value}/quote`, { method: "PATCH", headers: headers(), body: JSON.stringify({ status, lines: quoteForm.value.lines }) });
  if (!response.ok) { errorMessage.value = status === "sent" ? "El presupuesto solo puede enviarse desde diagnostico." : "Revisa las lineas del presupuesto."; return; }
  quote.value = await response.json() as RepairQuote;
  successMessage.value = status === "sent" ? "Presupuesto enviado al cliente." : "Borrador de presupuesto guardado.";
  await loadData();
}

async function approveQuote(): Promise<void> {
  if (!selectedRepairId.value) return;
  const response = await fetch(`/api/repairs/${selectedRepairId.value}/quote/approve`, { method: "POST", headers: headers() });
  if (!response.ok) { errorMessage.value = "No se pudo aprobar el presupuesto en el estado actual."; return; }
  quote.value = await response.json() as RepairQuote;
  successMessage.value = "Presupuesto aprobado. La reparacion puede comenzar.";
  await loadData();
}

onMounted(loadData);
</script>

<template>
  <section class="repairs-view">
    <header><div><p class="eyebrow">Taller</p><h1>Reparaciones</h1></div><button type="button" :disabled="loading" @click="loadData">Actualizar</button></header>
    <p v-if="errorMessage" class="feedback error">{{ errorMessage }}</p><p v-if="successMessage" class="feedback success">{{ successMessage }}</p>
    <div class="repair-grid">
      <section class="repair-list"><div class="section-heading"><div><p class="eyebrow">Ordenes activas</p><h2>Cola del taller</h2></div><span class="count">{{ repairs.length }}</span></div>
        <p v-if="!repairs.length" class="empty">No hay ordenes registradas.</p>
        <ul v-else class="repair-items"><li v-for="repair in repairs" :key="repair.id"><div class="repair-overview"><strong>{{ repair.brand }} {{ repair.model }}</strong><span>{{ customerName(repair.customerId) }} · {{ repair.reportedIssue }}</span></div><select :value="repair.status" @change="changeStatus(repair, $event)"><option value="received">Recibido</option><option value="diagnosing">Diagnostico</option><option value="quoted">Presupuestado</option><option value="approved">Aprobado</option><option value="repairing">En reparacion</option><option value="testing">En pruebas</option><option value="repaired">Reparado</option><option value="delivered">Entregado</option><option value="unrepairable">No reparable</option><option value="cancelled">Cancelado</option></select><form class="technical-form" @submit.prevent="saveTechnical(repair, { technicianId: (repair.technicianId ?? ''), diagnosis: (repair.diagnosis ?? '') })"><label><span>Tecnico</span><select v-model="repair.technicianId"><option value="">Sin asignar</option><option v-for="technician in technicians" :key="technician.id" :value="technician.id">{{ technician.displayName }}</option></select></label><label><span>Diagnostico</span><input v-model="repair.diagnosis" placeholder="Pendiente de diagnostico" /></label><button type="submit">Guardar ficha</button></form><button class="quote-toggle" type="button" @click="selectQuote(repair)">{{ selectedRepairId === repair.id ? "Editando presupuesto" : "Presupuesto" }}</button><form v-if="selectedRepairId === repair.id" class="quote-form" @submit.prevent="saveQuote('draft')"><div class="quote-heading"><div><span>Presupuesto</span><strong v-if="quote">{{ quote.status === "sent" ? "Enviado" : quote.status === "approved" ? "Aprobado" : "Borrador" }}</strong></div><output>{{ money(quoteTotal()) }}</output></div><div v-for="(line, index) in quoteForm.lines" :key="index" class="quote-line"><input v-model="line.description" required placeholder="Concepto" :disabled="quote?.status === 'approved'" /><input v-model.number="line.quantity" required min="1" max="1000" type="number" :disabled="quote?.status === 'approved'" /><input v-model.number="line.unitPriceCents" required min="0" type="number" :disabled="quote?.status === 'approved'" /><button type="button" :disabled="quoteForm.lines.length === 1 || quote?.status === 'approved'" @click="removeQuoteLine(index)">Quitar</button></div><div v-if="quote?.status === 'sent'" class="quote-actions"><button type="button" @click="approveQuote">Registrar aprobacion</button></div><div v-else-if="quote?.status !== 'approved'" class="quote-actions"><button type="button" @click="addQuoteLine">Anadir linea</button><button type="submit">Guardar borrador</button><button type="button" @click="saveQuote('sent')">Enviar presupuesto</button></div></form></li></ul>
      </section>
      <form class="customer-form" @submit.prevent="createRepair"><div><p class="eyebrow">Entrada</p><h2>Nueva reparacion</h2></div>
        <label><span>Cliente</span><select v-model="form.customerId" required><option disabled value="">Selecciona cliente</option><option v-for="customer in customers" :key="customer.id" :value="customer.id">{{ customer.displayName }}</option></select></label>
        <label><span>Tipo de equipo</span><input v-model="form.deviceType" required placeholder="Consola, movil..." /></label><label><span>Marca</span><input v-model="form.brand" required /></label><label><span>Modelo</span><input v-model="form.model" required /></label><label><span>Numero de serie</span><input v-model="form.serialNumber" /></label><label><span>Averia reportada</span><textarea v-model="form.reportedIssue" required rows="3" /></label><label><span>Accesorios entregados</span><input v-model="form.deliveredAccessories" /></label><button type="submit" :disabled="!customers.length">Crear orden</button>
      </form>
    </div>
  </section>
</template>