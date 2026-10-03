<script setup lang="ts">
import { onMounted, ref, type Ref, inject } from "vue";
import { listOrders, type PurchaseOrder, type Supplier } from "../../api";

const supplier = inject<Ref<Supplier | null>>("supplier");
const orders = ref<PurchaseOrder[]>([]);
const error = ref("");
const loading = ref(true);

onMounted(async () => {
  try {
    const allOrders = await listOrders();
    orders.value = allOrders.filter((order) => order.supplierId === supplier?.value?.id);
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="detail-tab"><h2>Pedidos de compra</h2><p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-else-if="loading" class="empty">Cargando pedidos...</p><p v-else-if="!orders.length" class="empty">Este proveedor todavia no tiene pedidos.</p><div v-else class="history-table-wrap"><table class="history-table"><thead><tr><th scope="col">Pedido</th><th scope="col">Tienda</th><th scope="col">Estado</th><th scope="col">Lineas</th></tr></thead><tbody><tr v-for="order in orders" :key="order.id"><th scope="row">{{ order.id.slice(0, 8) }}</th><td>{{ order.storeId }}</td><td>{{ order.status }}</td><td>{{ order.lines.length }}</td></tr></tbody></table></div></section>
</template>

<style scoped>
.history-table-wrap { border: 1px solid #cbd7d0; overflow-x: auto; }
.history-table { border-collapse: collapse; min-width: 520px; text-align: left; width: 100%; }
.history-table th, .history-table td { border-bottom: 1px solid #d6dfda; padding: 12px 14px; }
.history-table thead th { color: #60766d; font-family: "DM Mono", monospace; font-size: 10px; font-weight: 500; text-transform: uppercase; }
</style>
