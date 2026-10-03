<script setup lang="ts">
import { onMounted, ref } from "vue";
import { customerSession } from "./session";
import { repairStatusLabel, repairStatusTone } from "../repairs/status-labels";

interface Repair {
  id: string;
  deviceType: string;
  brand: string;
  model: string;
  reportedIssue: string;
  status: string;
  createdAt: string;
}

const repairs = ref<Repair[]>([]);
const loading = ref(true);
const error = ref("");
const date = (value: string) => new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const response = await fetch("/api/customer/repairs", { headers: { authorization: `Bearer ${customerSession.value?.accessToken ?? ""}` } });
    if (!response.ok) throw new Error("No se pudieron cargar tus reparaciones.");
    repairs.value = await response.json() as Repair[];
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="customer-view">
    <header class="customer-view-header"><div><p class="eyebrow">Portal de cliente</p><h1>Reparaciones</h1></div><p v-if="!loading && !error" class="customer-list-count">{{ repairs.length }} {{ repairs.length === 1 ? "reparación" : "reparaciones" }}</p></header>
    <p v-if="loading" class="empty" aria-live="polite">Cargando tus reparaciones...</p>
    <p v-else-if="error" class="feedback error" role="alert">{{ error }} <button class="secondary" type="button" @click="load">Reintentar</button></p>
    <section v-else-if="!repairs.length" class="customer-table-empty"><p class="empty">No tienes reparaciones registradas.</p></section>
    <div v-else class="customer-table-wrap">
      <table class="customer-data-table">
        <thead><tr><th scope="col">Equipo</th><th scope="col">Avería</th><th scope="col">Fecha de entrada</th><th scope="col">Estado</th><th scope="col"><span class="visually-hidden">Acción</span></th></tr></thead>
        <tbody><tr v-for="repair in repairs" :key="repair.id">
          <th scope="row"><RouterLink :to="{ name: 'customer.repair.detail', params: { id: repair.id } }">{{ repair.brand }} {{ repair.model }}<small>{{ repair.deviceType }}</small></RouterLink></th>
          <td>{{ repair.reportedIssue }}</td><td>{{ date(repair.createdAt) }}</td>
          <td><span :class="['status-pill', repairStatusTone(repair.status)]">{{ repairStatusLabel(repair.status) }}</span></td>
          <td><RouterLink class="customer-table-action" :to="{ name: 'customer.repair.detail', params: { id: repair.id } }">Ver reparación<span class="visually-hidden"> {{ repair.brand }} {{ repair.model }}</span></RouterLink></td>
        </tr></tbody>
      </table>
    </div>
  </section>
</template>
