<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { listAccessibleStores, type Store } from "../../admin/api";
import { staffSession } from "../../auth/session";
import { listItems, type Item } from "../api";

const route = useRoute();
const router = useRouter();
const stores = ref<Array<Pick<Store, "id" | "name" | "active">>>([]);
const items = ref<Item[]>([]);
const storeId = ref(String(route.query.storeId ?? staffSession.value?.user.defaultStoreId ?? staffSession.value?.user.storeId ?? ""));
const query = ref("");
const error = ref("");
const filtered = computed(() => items.value.filter((item) => `${item.sku} ${item.name}`.toLocaleLowerCase().includes(query.value.toLocaleLowerCase())));
async function load(): Promise<void> { error.value = ""; if (!storeId.value) { items.value = []; return; } try { items.value = await listItems(storeId.value); } catch (reason) { error.value = (reason as Error).message; } }
async function changeStore(): Promise<void> { await router.replace({ query: storeId.value ? { storeId: storeId.value } : {} }); await load(); }
async function initialize(): Promise<void> { try { stores.value = await listAccessibleStores(); if (!storeId.value && stores.value.length === 1) storeId.value = stores.value[0].id; await load(); } catch (reason) { error.value = (reason as Error).message; } }
function storeName(): string { return stores.value.find((store) => store.id === storeId.value)?.name ?? ""; }
onMounted(initialize);
</script>

<template>
  <section><header><div><p class="eyebrow">Operaciones</p><h1>Almacen <span class="count">{{ filtered.length }}</span></h1></div><RouterLink class="button-link" :to="{ name: 'inventory.create' }">Nuevo material</RouterLink></header>
    <div class="filter-bar"><label v-if="stores.length > 1">Tienda<select v-model="storeId" aria-label="Tienda de inventario" @change="changeStore"><option value="">Selecciona una tienda</option><option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option></select></label><input v-model="query" placeholder="Buscar por SKU o nombre" /><RouterLink :to="{ name: 'inventory.alerts', query: storeId ? { storeId } : {} }">Ver alertas</RouterLink><RouterLink :to="{ name: 'suppliers.list' }">Proveedores</RouterLink><RouterLink :to="{ name: 'purchase-orders.list', query: storeId ? { storeId } : {} }">Ordenes de compra</RouterLink></div>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="!storeId && !stores.length" class="empty">No tienes tiendas asignadas.</p><p v-else-if="!storeId" class="empty">Selecciona una tienda para consultar el almacen.</p><p v-else class="eyebrow">{{ storeName() }}</p>
    <div class="customer-list"><p v-if="storeId && !filtered.length" class="empty">No hay materiales registrados en esta tienda.</p><RouterLink v-for="item in filtered" :key="item.id" class="customer-row" :to="{ name: 'inventory.detail.general', params: { id: item.id }, query: { storeId } }"><strong>{{ item.name }}</strong><span>{{ item.sku }}</span><span>{{ item.stock }} {{ item.unit }}</span><span class="status-pill">Min. {{ item.minimumStock }}</span></RouterLink></div>
  </section>
</template>

<style scoped>
header { margin-bottom: 18px; }
.filter-bar label { display: grid; gap: 6px; color: #49675a; font-size: 12px; font-weight: 700; }
.filter-bar select { background: #fff; border: 1px solid #b5c9bd; border-radius: 4px; font: inherit; padding: 9px; }
</style>
