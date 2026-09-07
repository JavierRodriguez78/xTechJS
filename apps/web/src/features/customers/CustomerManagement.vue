<script setup lang="ts">
import { ref } from "vue";

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

const accessToken = ref("");
const customers = ref<Customer[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const selectedCustomerId = ref<string | null>(null);
const form = ref({ displayName: "", email: "", phone: "", address: "", taxId: "", internalNotes: "", tags: "" });

function headers(): HeadersInit {
  return { "content-type": "application/json", authorization: `Bearer ${accessToken.value}` };
}

async function loadCustomers(): Promise<void> {
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await fetch("/api/customers", { headers: headers() });
    if (!response.ok) throw new Error("No se pudieron cargar los clientes. Comprueba tu sesion.");
    customers.value = await response.json() as Customer[];
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    loading.value = false;
  }
}

async function createCustomer(): Promise<void> {
  errorMessage.value = "";
  successMessage.value = "";
  const response = await fetch("/api/customers", {
    method: "POST",
    headers: headers(),
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
  await loadCustomers();
}

async function selectCustomer(id: string): Promise<void> {
  errorMessage.value = "";
  const response = await fetch(`/api/customers/${id}`, { headers: headers() });
  if (!response.ok) {
    errorMessage.value = "No se pudo cargar la ficha del cliente.";
    return;
  }
  const customer = await response.json() as Customer;
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

async function saveCustomer(): Promise<void> {
  if (!selectedCustomerId.value) return createCustomer();
  errorMessage.value = "";
  successMessage.value = "";
  const response = await fetch(`/api/customers/${selectedCustomerId.value}`, {
    method: "PUT",
    headers: headers(),
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
  await loadCustomers();
}

function resetForm(): void {
  selectedCustomerId.value = null;
  form.value = { displayName: "", email: "", phone: "", address: "", taxId: "", internalNotes: "", tags: "" };
}
</script>

<template>
  <section class="customers-view">
    <header>
      <div>
        <p class="eyebrow">CRM</p>
        <h1>Clientes</h1>
      </div>
    </header>

    <section class="session-bar" aria-label="Sesion administrativa">
      <label>
        <span>Token de sesion</span>
        <input v-model="accessToken" type="password" placeholder="Pega el accessToken del login" autocomplete="off" />
      </label>
      <button type="button" :disabled="loading || !accessToken" @click="loadCustomers">
        {{ loading ? "Cargando" : "Cargar clientes" }}
      </button>
    </section>

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
            <button type="button" :class="{ selected: customer.id === selectedCustomerId }" @click="selectCustomer(customer.id)">
            <div>
              <strong>{{ customer.displayName }}</strong>
              <span>{{ customer.email || customer.phone || "Sin datos de contacto" }}</span>
            </div>
            <span v-if="customer.tags.length" class="tag">{{ customer.tags[0] }}</span>
            </button>
          </li>
        </ul>
      </section>

      <form class="customer-form" @submit.prevent="saveCustomer">
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
          <button type="submit" :disabled="!accessToken">{{ selectedCustomerId ? "Guardar cambios" : "Guardar cliente" }}</button>
        </div>
      </form>
    </div>
  </section>
</template>