<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { listAccessibleStores, type Store } from "../../admin/api";
import { closeCashRegister, getCashRegister, openCashRegister, type CashRegister } from "../api";
import { staffSession } from "../../auth/session";

const route = useRoute();
const router = useRouter();
const stores = ref<Array<Pick<Store, "id" | "name" | "active">>>([]);
const storeId = ref(String(route.query.storeId ?? staffSession.value?.user.defaultStoreId ?? staffSession.value?.user.storeId ?? ""));
const register = ref<CashRegister | null>(null);
const error = ref("");
const busy = ref(false);
const date = new Date().toISOString().slice(0, 10);
const storeName = () => stores.value.find((store) => store.id === storeId.value)?.name ?? "";
const money = (value: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value / 100);
async function load(): Promise<void> {
  register.value = null;
  error.value = "";
  if (!storeId.value) return;
  try { register.value = await getCashRegister(date, storeId.value); }
  catch (reason) { if (!(reason as Error).message.toLowerCase().includes("not found")) error.value = (reason as Error).message; }
}
async function changeStore(): Promise<void> { await router.replace({ query: storeId.value ? { storeId: storeId.value } : {} }); await load(); }
async function open(): Promise<void> {
  if (!storeId.value) return;
  busy.value = true; error.value = "";
  try { register.value = await openCashRegister(date, storeId.value); }
  catch (reason) { error.value = (reason as Error).message; }
  finally { busy.value = false; }
}
async function close(): Promise<void> {
  if (!storeId.value) return;
  busy.value = true; error.value = "";
  try { register.value = await closeCashRegister(date, storeId.value); }
  catch (reason) { error.value = (reason as Error).message; }
  finally { busy.value = false; }
}
async function initialize(): Promise<void> {
  try { stores.value = await listAccessibleStores(); if (!storeId.value && stores.value.length === 1) storeId.value = stores.value[0].id; await load(); }
  catch (reason) { error.value = (reason as Error).message; }
}
onMounted(initialize);
</script>

<template>
  <section><header><div><p class="eyebrow">TPV</p><h1>Caja diaria</h1></div></header>
    <div v-if="stores.length > 1" class="filter-bar"><label>Tienda<select v-model="storeId" @change="changeStore"><option value="">Selecciona una tienda</option><option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option></select></label></div>
    <section class="detail-tab"><p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="!storeId" class="empty">Selecciona una tienda para ver la caja.</p><template v-else><h2>{{ register ? register.status === 'open' ? 'Caja abierta' : 'Caja cerrada' : 'Sin apertura' }}<span v-if="storeName()"> · {{ storeName() }}</span></h2><p>Fecha: {{ date }}</p><dl v-if="register"><dt>Cobrado</dt><dd>{{ money(register.paidCents) }}</dd><dt>Reembolsado</dt><dd>{{ money(register.refundedCents) }}</dd><dt>Neto</dt><dd>{{ money(register.netCents) }}</dd></dl><button v-if="!register" :disabled="busy" @click="open">{{ busy ? 'Abriendo...' : 'Abrir caja' }}</button><button v-else-if="register.status === 'open'" :disabled="busy" @click="close">{{ busy ? 'Cerrando...' : 'Cerrar caja' }}</button></template></section>
  </section>
</template>

<style scoped>
.filter-bar label { display: grid; gap: 6px; color: #49675a; font-size: 12px; font-weight: 700; }
.filter-bar select { background: #fff; border: 1px solid #b5c9bd; border-radius: 4px; font: inherit; min-width: 220px; padding: 9px; }
</style>