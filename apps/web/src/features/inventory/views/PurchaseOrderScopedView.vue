<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { listAccessibleStores, type Store } from "../../admin/api";
import { createOrder, listItems, listOrders, listSuppliers, receiveOrder, type Item, type PurchaseOrder, type Supplier } from "../api";
import { staffSession } from "../../auth/session";

const route = useRoute();
const router = useRouter();
const stores = ref<Array<Pick<Store, "id" | "name" | "active">>>([]);
const orders = ref<PurchaseOrder[]>([]);
const items = ref<Item[]>([]);
const suppliers = ref<Supplier[]>([]);
const error = ref("");
const loading = ref(false);
const saving = ref(false);
const storeId = ref(String(route.query.storeId ?? staffSession.value?.user.defaultStoreId ?? staffSession.value?.user.storeId ?? ""));
const form = ref({ supplierId: "", itemId: "", quantity: 1, unitCostCents: 0 });
async function load(): Promise<void> {
  if (!storeId.value) { orders.value = []; items.value = []; return; }
  loading.value = true;
  error.value = "";
  try { [orders.value, items.value, suppliers.value] = await Promise.all([listOrders(storeId.value), listItems(storeId.value), listSuppliers({ active: true })]); }
  catch (reason) { error.value = (reason as Error).message; }
  finally { loading.value = false; }
}
async function changeStore(): Promise<void> {
  await router.replace({ query: storeId.value ? { storeId: storeId.value } : {} });
  form.value = { supplierId: "", itemId: "", quantity: 1, unitCostCents: 0 };
  await load();
}
async function save(): Promise<void> {
  saving.value = true;
  error.value = "";
  try {
    await createOrder({ storeId: storeId.value, supplierId: form.value.supplierId, lines: [{ inventoryItemId: form.value.itemId, quantity: form.value.quantity, unitCostCents: form.value.unitCostCents }] });
    await load();
  } catch (reason) { error.value = (reason as Error).message; }
  finally { saving.value = false; }
}
async function receive(id: string): Promise<void> {
  try { await receiveOrder(id); await load(); }
  catch (reason) { error.value = (reason as Error).message; }
}
async function initialize(): Promise<void> {
  try {
    stores.value = await listAccessibleStores();
    if (!storeId.value && stores.value.length === 1) storeId.value = stores.value[0].id;
    await load();
  } catch (reason) { error.value = (reason as Error).message; }
}
 onMounted(initialize);
</script>

<template>
  <section class="purchase-orders-view">
    <header><div><p class="eyebrow">Almacen</p><h1>Ordenes de compra</h1></div></header>
    <div v-if="stores.length > 1" class="filter-bar"><label>Tienda<select v-model="storeId" @change="changeStore"><option value="">Selecciona una tienda</option><option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option></select></label></div>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <p v-if="!storeId && !loading" class="empty">Selecciona una tienda para consultar o crear pedidos de compra.</p>
    <div v-else class="operations-grid">
      <section class="operation-panel"><h2>Pedidos {{ stores.find((store) => store.id === storeId)?.name ?? '' }}</h2><p v-if="loading" class="skeleton-row" aria-label="Cargando pedidos" /><ul v-else class="operation-list"><li v-for="order in orders" :key="order.id"><div><strong>{{ order.id.slice(0, 8) }}</strong><span>{{ order.status }} · {{ order.lines.length }} lineas</span></div><button v-if="order.status !== 'received'" type="button" @click="receive(order.id)">Recibir</button></li><li v-if="!orders.length">No hay pedidos para esta tienda.</li></ul></section>
      <form class="operation-panel operation-form" @submit.prevent="save"><h2>Nueva orden</h2><label>Proveedor<select v-model="form.supplierId" required><option disabled value="">Selecciona proveedor</option><option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option></select></label><label>Material<select v-model="form.itemId" required><option disabled value="">Selecciona material</option><option v-for="item in items" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label>Cantidad<input v-model.number="form.quantity" type="number" min="1" required /></label><label>Coste unitario (centimos)<input v-model.number="form.unitCostCents" type="number" min="0" required /></label><button :disabled="saving || loading || !storeId || !form.itemId || !form.supplierId">{{ saving ? 'Guardando...' : 'Crear pedido' }}</button></form>
    </div>
  </section>
</template>

<style scoped>
.purchase-orders-view { max-width: 1200px; }
.filter-bar label { display: grid; gap: 6px; color: #49675a; font-size: 12px; font-weight: 700; }
.filter-bar select { background: #fff; border: 1px solid #b5c9bd; border-radius: 4px; font: inherit; padding: 9px; min-width: 220px; }
.operation-panel h2 { font-size: 16px; }
.operation-list li:only-child { color: #698078; }
</style>
