<script setup lang="ts">
import { onMounted, ref } from "vue";
import { listSuppliers, type Supplier } from "../api";
import { RouterLink } from "vue-router";

const suppliers = ref<Supplier[]>([]);
const query = ref("");
const category = ref("");
const status = ref<"all" | "active" | "inactive">("active");
const error = ref("");
const loading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    suppliers.value = await listSuppliers({ q: query.value || undefined, category: category.value || undefined, active: status.value === "all" ? undefined : status.value === "active" });
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="supplier-list-view">
    <header><div><p class="eyebrow">Almacen</p><h1>Proveedores</h1></div><RouterLink class="button-link" :to="{ name: 'suppliers.create' }">Nuevo proveedor</RouterLink></header>
    <form class="filter-bar" @submit.prevent="load">
      <input v-model="query" aria-label="Buscar proveedor" placeholder="Nombre, razon social o NIF" />
      <input v-model="category" aria-label="Categoria" placeholder="Categoria" />
      <select v-model="status" aria-label="Estado"><option value="active">Activos</option><option value="inactive">Dados de baja</option><option value="all">Todos</option></select>
      <button type="submit">Buscar</button>
    </form>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <section class="supplier-table-wrap" aria-label="Listado de proveedores">
        <table class="supplier-table">
          <thead><tr><th scope="col">Proveedor</th><th scope="col">NIF</th><th scope="col">Categoria</th><th scope="col">Contacto</th><th scope="col">Estado</th></tr></thead>
          <tbody>
            <tr v-if="loading"><td colspan="5" class="empty">Cargando proveedores...</td></tr>
            <tr v-else-if="!suppliers.length"><td colspan="5" class="empty">No hay proveedores para estos filtros.</td></tr>
            <tr v-for="supplier in suppliers" v-else :key="supplier.id">
              <th scope="row"><RouterLink :to="{ name: 'suppliers.detail.general', params: { id: supplier.id } }">{{ supplier.name }}</RouterLink><small>{{ supplier.legalName || "" }}</small></th>
              <td>{{ supplier.taxId || "-" }}</td><td>{{ supplier.category || "-" }}</td><td>{{ supplier.email || supplier.phone || "-" }}</td>
              <td><span :class="['status-pill', supplier.active === false ? 'inactive' : 'active']">{{ supplier.active === false ? "Baja" : "Activo" }}</span></td>
            </tr>
          </tbody>
        </table>
    </section>
  </section>
</template>

<style scoped>
header { align-items: center; display: flex; justify-content: space-between; gap: 16px; }
.supplier-table-wrap { border: 1px solid #cbd7d0; min-width: 0; overflow-x: auto; }
.supplier-table { border-collapse: collapse; min-width: 640px; text-align: left; width: 100%; }
.supplier-table thead { background: #e2ebe5; }
.supplier-table th, .supplier-table td { border-bottom: 1px solid #d6dfda; padding: 12px 14px; }
.supplier-table thead th { color: #60766d; font-family: "DM Mono", monospace; font-size: 10px; font-weight: 500; text-transform: uppercase; white-space: nowrap; }
.supplier-table tbody th { font-size: 12px; min-width: 150px; }
.supplier-table tbody th a { color: #173c36; text-decoration: none; }
.supplier-table tbody th small { color: #698078; display: block; font-size: 10px; font-weight: 400; margin-top: 4px; }
.supplier-table tbody td { color: #49675a; font-size: 11px; }
@media (max-width: 600px) { header { align-items: flex-start; flex-direction: column; } }
</style>
