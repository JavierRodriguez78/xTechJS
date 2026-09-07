<script setup lang="ts">
import { onMounted, ref } from "vue";

interface Customer { id: string; displayName: string; }
interface Repair { id: string; customerId: string; deviceType: string; brand: string; model: string; reportedIssue: string; status: string; }

const props = defineProps<{ accessToken: string }>();
const customers = ref<Customer[]>([]);
const repairs = ref<Repair[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const form = ref({ customerId: "", deviceType: "", brand: "", model: "", serialNumber: "", reportedIssue: "", deliveredAccessories: "" });

function headers(): HeadersInit { return { "content-type": "application/json", authorization: `Bearer ${props.accessToken}` }; }
function customerName(id: string): string { return customers.value.find((customer) => customer.id === id)?.displayName ?? "Cliente"; }

async function loadData(): Promise<void> {
  loading.value = true; errorMessage.value = "";
  try {
    const [customersResponse, repairsResponse] = await Promise.all([fetch("/api/customers", { headers: headers() }), fetch("/api/repairs", { headers: headers() })]);
    if (!customersResponse.ok || !repairsResponse.ok) throw new Error("No se pudo cargar la actividad del taller.");
    customers.value = await customersResponse.json() as Customer[];
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

onMounted(loadData);
</script>

<template>
  <section class="repairs-view">
    <header><div><p class="eyebrow">Taller</p><h1>Reparaciones</h1></div><button type="button" :disabled="loading" @click="loadData">Actualizar</button></header>
    <p v-if="errorMessage" class="feedback error">{{ errorMessage }}</p><p v-if="successMessage" class="feedback success">{{ successMessage }}</p>
    <div class="repair-grid">
      <section class="repair-list"><div class="section-heading"><div><p class="eyebrow">Ordenes activas</p><h2>Cola del taller</h2></div><span class="count">{{ repairs.length }}</span></div>
        <p v-if="!repairs.length" class="empty">No hay ordenes registradas.</p>
        <ul v-else class="repair-items"><li v-for="repair in repairs" :key="repair.id"><div><strong>{{ repair.brand }} {{ repair.model }}</strong><span>{{ customerName(repair.customerId) }} · {{ repair.reportedIssue }}</span></div><select :value="repair.status" @change="changeStatus(repair, $event)"><option value="received">Recibido</option><option value="diagnosing">Diagnostico</option><option value="quoted">Presupuestado</option><option value="approved">Aprobado</option><option value="repairing">En reparacion</option><option value="testing">En pruebas</option><option value="repaired">Reparado</option><option value="delivered">Entregado</option><option value="unrepairable">No reparable</option><option value="cancelled">Cancelado</option></select></li></ul>
      </section>
      <form class="customer-form" @submit.prevent="createRepair"><div><p class="eyebrow">Entrada</p><h2>Nueva reparacion</h2></div>
        <label><span>Cliente</span><select v-model="form.customerId" required><option disabled value="">Selecciona cliente</option><option v-for="customer in customers" :key="customer.id" :value="customer.id">{{ customer.displayName }}</option></select></label>
        <label><span>Tipo de equipo</span><input v-model="form.deviceType" required placeholder="Consola, movil..." /></label><label><span>Marca</span><input v-model="form.brand" required /></label><label><span>Modelo</span><input v-model="form.model" required /></label><label><span>Numero de serie</span><input v-model="form.serialNumber" /></label><label><span>Averia reportada</span><textarea v-model="form.reportedIssue" required rows="3" /></label><label><span>Accesorios entregados</span><input v-model="form.deliveredAccessories" /></label><button type="submit" :disabled="!customers.length">Crear orden</button>
      </form>
    </div>
  </section>
</template>