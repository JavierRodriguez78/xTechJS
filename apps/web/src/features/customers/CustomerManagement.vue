<script setup lang="ts">
import { onMounted, ref } from "vue";

const props = defineProps<{ accessToken: string }>();

interface Customer {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  internalNotes: string | null;
  tags: string[];
}

interface CustomerRepair {
  id: string;
  deviceType: string;
  brand: string;
  model: string;
  reportedIssue: string;
  status: string;
}

const customers = ref<Customer[]>([]);
const customerRepairs = ref<CustomerRepair[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const selectedCustomerId = ref<string | null>(null);
const form = ref({ displayName: "", email: "", phone: "", address: "", taxId: "", internalNotes: "", tags: "" });

function headers(accessToken: string): HeadersInit {
  return { "content-type": "application/json", authorization: `Bearer ${accessToken}` };
}

async function loadCustomers(accessToken: string): Promise<void> {
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await fetch("/api/customers", { headers: headers(accessToken) });
    if (!response.ok) throw new Error("No se pudieron cargar los clientes. Comprueba tu sesion.");
    customers.value = await response.json() as Customer[];
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    loading.value = false;
  }
}

async function createCustomer(accessToken: string): Promise<void> {
  errorMessage.value = "";
  successMessage.value = "";
  const response = await fetch("/api/customers", {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      displayName: form.value.displayName,
      email: form.value.email || undefined,
      phone: form.value.phone || undefined,
      address: form.value.address || undefined,
      taxId: form.value.taxId || undefined,
      internalNotes: form.value.internalNotes || undefined,
      tags: form.value.tags ? form.value.tags.split(",") : undefined
    })
  });
  if (!response.ok) {
    errorMessage.value = "No se pudo guardar el cliente. Comprueba los datos y tus permisos.";
    return;
  }
  resetForm();
  successMessage.value = "Cliente creado.";
  await loadCustomers(accessToken);
}

async function selectCustomer(id: string, accessToken: string): Promise<void> {
  errorMessage.value = "";
  const [customerResponse, repairsResponse] = await Promise.all([
    fetch(`/api/customers/${id}`, { headers: headers(accessToken) }),
    fetch(`/api/customers/${id}/repairs`, { headers: headers(accessToken) })
  ]);
  if (!customerResponse.ok || !repairsResponse.ok) {
    errorMessage.value = "No se pudo cargar la ficha del cliente.";
    return;
  }
  const customer = await customerResponse.json() as Customer;
  customerRepairs.value = await repairsResponse.json() as CustomerRepair[];
  selectedCustomerId.value = customer.id;
  form.value = {
    displayName: customer.displayName,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    taxId: customer.taxId ?? "",
    internalNotes: customer.internalNotes ?? "",
    tags: customer.tags.join(", ")
  };
}

async function saveCustomer(accessToken: string): Promise<void> {
  if (!selectedCustomerId.value) return createCustomer(accessToken);
  errorMessage.value = "";
  successMessage.value = "";
  const response = await fetch(`/api/customers/${selectedCustomerId.value}`, {
    method: "PATCH",
    headers: headers(accessToken),
    body: JSON.stringify({
      displayName: form.value.displayName,
      email: form.value.email || undefined,
      phone: form.value.phone || undefined,
      address: form.value.address || undefined,
      taxId: form.value.taxId || undefined,
      internalNotes: form.value.internalNotes || undefined,
      tags: form.value.tags ? form.value.tags.split(",") : []
    })
  });
  if (!response.ok) {
    errorMessage.value = "No se pudo actualizar el cliente. Comprueba los datos y tus permisos.";
    return;
  }
  successMessage.value = "Ficha actualizada.";
  await loadCustomers(accessToken);
}

function resetForm(): void {
  selectedCustomerId.value = null;
  customerRepairs.value = [];
  form.value = { displayName: "", email: "", phone: "", address: "", taxId: "", internalNotes: "", tags: "" };
}

onMounted(() => loadCustomers(props.accessToken));
</script>

<template>
  <section class="customers-view">
    <header>
      <div>
        <p class="eyebrow">CRM</p>
        <h1>Clientes</h1>
      </div>
    </header>

    <button class="load-customers" type="button" :disabled="loading" @click="loadCustomers(accessToken)">
      {{ loading ? "Cargando" : "Actualizar clientes" }}
    </button>

    <div class="customer-grid">
      <section class="customer-list" aria-labelledby="customer-list-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Directorio</p>
            <h2 id="customer-list-title">Clientes registrados</h2>
          </div>
          <span class="count">{{ customers.length }}</span>
        </div>
        <p v-if="errorMessage" class="feedback error">{{ errorMessage }}</p>
        <p v-else-if="!customers.length" class="empty">Carga la lista para consultar los clientes registrados.</p>
        <ul v-else class="customer-items">
          <li v-for="customer in customers" :key="customer.id">
            <button type="button" :class="{ selected: customer.id === selectedCustomerId }" @click="selectCustomer(customer.id, accessToken)">
            <div>
              <strong>{{ customer.displayName }}</strong>
              <span>{{ customer.email || customer.phone || "Sin datos de contacto" }}</span>
            </div>
            <span v-if="customer.tags.length" class="tag">{{ customer.tags[0] }}</span>
            </button>
          </li>
        </ul>
        <section v-if="selectedCustomerId" class="customer-repair-history" aria-labelledby="customer-repairs-title">
          <div class="section-heading"><div><p class="eyebrow">Historial</p><h2 id="customer-repairs-title">Reparaciones</h2></div><span class="count">{{ customerRepairs.length }}</span></div>
          <p v-if="!customerRepairs.length" class="empty">Este cliente no tiene reparaciones registradas.</p>
          <ul v-else class="customer-repair-items"><li v-for="repair in customerRepairs" :key="repair.id"><strong>{{ repair.brand }} {{ repair.model }}</strong><span>{{ repair.deviceType }} · {{ repair.reportedIssue }}</span><em>{{ repair.status }}</em></li></ul>
        </section>
      </section>

      <form class="customer-form" @submit.prevent="saveCustomer(accessToken)">
        <div>
          <p class="eyebrow">{{ selectedCustomerId ? "Ficha" : "Alta" }}</p>
          <h2>{{ selectedCustomerId ? "Editar cliente" : "Nuevo cliente" }}</h2>
        </div>
        <label><span>Nombre o razon social</span><input v-model="form.displayName" required maxlength="160" /></label>
        <label><span>Email</span><input v-model="form.email" type="email" maxlength="320" /></label>
        <label><span>Telefono</span><input v-model="form.phone" maxlength="64" /></label>
        <label><span>Direccion</span><input v-model="form.address" maxlength="1000" /></label>
        <label><span>NIF/DNI</span><input v-model="form.taxId" maxlength="64" /></label>
        <label><span>Etiquetas</span><input v-model="form.tags" placeholder="recurrente, particular" /></label>
        <label><span>Notas internas</span><textarea v-model="form.internalNotes" maxlength="5000" rows="4" /></label>
        <p v-if="successMessage" class="feedback success">{{ successMessage }}</p>
        <div class="form-actions">
          <button v-if="selectedCustomerId" class="secondary" type="button" @click="resetForm">Nuevo</button>
          <button type="submit">{{ selectedCustomerId ? "Guardar cambios" : "Guardar cliente" }}</button>
        </div>
      </form>
    </div>
  </section>
</template>