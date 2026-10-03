<script setup lang="ts">
import { onMounted, provide, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { getSupplier, type Supplier } from "../api";

const route = useRoute();
const supplier = ref<Supplier | null>(null);
const error = ref("");
provide("supplier", supplier);

async function load(): Promise<void> {
  error.value = "";
  supplier.value = null;
  try {
    supplier.value = await getSupplier(String(route.params.id));
  } catch (reason) {
    error.value = (reason as Error).message;
  }
}

onMounted(load);
watch(() => route.params.id, () => { void load(); });
</script>

<template>
  <section v-if="supplier" class="supplier-detail">
    <p class="breadcrumb"><RouterLink :to="{ name: 'suppliers.list' }">Proveedores</RouterLink> / {{ supplier.name }}</p>
    <header>
      <div><p class="eyebrow">Proveedor</p><h1>{{ supplier.name }}</h1><span :class="['status-pill', supplier.active ? 'active' : 'inactive']">{{ supplier.active ? "Activo" : "Baja" }}</span></div>
    </header>
    <nav class="tab-nav" aria-label="Secciones del proveedor">
      <RouterLink :to="{ name: 'suppliers.detail.general' }">Datos generales</RouterLink>
      <RouterLink :to="{ name: 'suppliers.detail.orders' }">Pedidos de compra</RouterLink>
      <RouterLink :to="{ name: 'suppliers.detail.catalog' }">Catalogo de repuestos</RouterLink>
    </nav>
    <RouterView />
  </section>
  <p v-else class="feedback" :class="{ error }" role="status">{{ error || "Cargando proveedor..." }}</p>
</template>
