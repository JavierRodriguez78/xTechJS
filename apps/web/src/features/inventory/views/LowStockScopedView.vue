<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { listAccessibleStores, type Store } from "../../admin/api";
import { staffSession } from "../../auth/session";
import { lowStock, type Item } from "../api";

const route = useRoute();
const router = useRouter();
const stores = ref<Array<Pick<Store, "id" | "name" | "active">>>([]);
const items = ref<Item[]>([]);
const storeId = ref(String(route.query.storeId ?? staffSession.value?.user.defaultStoreId ?? staffSession.value?.user.storeId ?? ""));
const error = ref("");
async function load(): Promise<void> { error.value = ""; items.value = []; if (!storeId.value) return; try { items.value = await lowStock(storeId.value); } catch (reason) { error.value = (reason as Error).message; } }
async function changeStore(): Promise<void> { await router.replace({ query: storeId.value ? { storeId: storeId.value } : {} }); await load(); }
async function initialize(): Promise<void> { try { stores.value = await listAccessibleStores(); if (!storeId.value && stores.value.length === 1) storeId.value = stores.value[0].id; await load(); } catch (reason) { error.value = (reason as Error).message; } }
onMounted(initialize);
</script>

<template>
  <section><header><div><p class="eyebrow">Almacen</p><h1>Alertas de stock bajo</h1></div></header>
    <div v-if="stores.length > 1" class="filter-bar"><label>Tienda<select v-model="storeId" aria-label="Tienda de inventario" @change="changeStore"><option value="">Selecciona una tienda</option><option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option></select></label></div>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="!storeId" class="empty">Selecciona una tienda para consultar las alertas.</p>
    <div class="customer-list"><p v-if="storeId && !items.length" class="empty">No hay alertas de stock bajo.</p><RouterLink v-for="item in items" :key="item.id" class="customer-row" :to="{ name: 'inventory.detail.general', params: { id: item.id }, query: { storeId } }"><strong>{{ item.name }}</strong><span>{{ item.sku }}</span><span>{{ item.stock }} {{ item.unit }}</span><span class="status-pill">Min. {{ item.minimumStock }}</span></RouterLink></div>
  </section>
</template>

<style scoped>
header { margin-bottom: 18px; }
.filter-bar label { display: grid; gap: 6px; color: #49675a; font-size: 12px; font-weight: 700; }
.filter-bar select { background: #fff; border: 1px solid #b5c9bd; border-radius: 4px; font: inherit; padding: 9px; }
</style>
