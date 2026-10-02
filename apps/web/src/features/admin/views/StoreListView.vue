<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { listStores, updateStore, type Store } from "../api";
const route = useRoute();
const router = useRouter();
const stores = ref<Store[]>([]); const error = ref("");
const query = computed({ get: () => String(route.query.q ?? ""), set: (value: string) => { void router.replace({ query: { ...route.query, q: value || undefined } }); } });
const status = computed({ get: () => String(route.query.estado ?? ""), set: (value: string) => { void router.replace({ query: { ...route.query, estado: value || undefined } }); } });
const filtered = computed(() => stores.value.filter((store) => `${store.name} ${store.address}`.toLowerCase().includes(query.value.toLowerCase()) && (!status.value || String(store.active) === status.value)));
async function load(): Promise<void> { try { stores.value = await listStores(); } catch (reason) { error.value = (reason as Error).message; } }
async function toggle(store: Store): Promise<void> { try { await updateStore(store.id, { active: !store.active }); await load(); } catch (reason) { error.value = (reason as Error).message; } }
onMounted(load);
</script>
<template>
	<section>
		<header><div><p class="eyebrow">Administracion</p><h1>Tiendas <span class="count">{{ filtered.length }}</span></h1></div><RouterLink class="button-link" :to="{ name: 'admin.stores.create' }">Nueva tienda</RouterLink></header>
		<div class="filter-bar"><input v-model="query" aria-label="Buscar tiendas" placeholder="Buscar por nombre o direccion" /><select v-model="status" aria-label="Estado"><option value="">Todos los estados</option><option value="true">Activas</option><option value="false">Inactivas</option></select><button v-if="query || status" class="secondary" @click="router.replace({ query: {} })">Limpiar filtros</button></div>
		<p v-if="error" class="feedback error" role="alert">{{ error }}</p>
		<div class="store-table-wrapper"><table><thead><tr><th>Tienda</th><th>Direccion</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-for="store in filtered" :key="store.id"><td><RouterLink :to="{ name: 'admin.stores.edit', params: { id: store.id } }">{{ store.name }}</RouterLink><small>{{ store.email || store.phone }}</small></td><td>{{ store.address }}<small v-if="!store.addressPostalCode || !store.addressCity || !store.addressProvince" class="error">Direccion pendiente de completar</small></td><td>{{ store.active ? 'Activa' : 'Inactiva' }}</td><td><div class="inline-actions"><RouterLink :to="{ name: 'admin.stores.edit', params: { id: store.id } }">Editar</RouterLink><button class="secondary" @click="toggle(store)">{{ store.active ? 'Desactivar' : 'Activar' }}</button></div></td></tr></tbody></table></div>
		<p v-if="!filtered.length" class="empty">{{ stores.length ? 'Ninguna tienda coincide con los filtros.' : 'No hay tiendas configuradas.' }}</p>
	</section>
</template>
<style scoped>
.store-table-wrapper { overflow-x: auto; }
table { border-collapse: collapse; font-size: 13px; width: 100%; }
th { color: #49675a; font-size: 12px; text-align: left; }
td, th { border-bottom: 1px solid #cbd7d0; padding: 16px 12px; vertical-align: top; }
td a { color: #173c36; font-weight: 700; }
td small { color: #698078; display: block; margin-top: 6px; }
td small.error { color: #a33424; }
.inline-actions { flex-wrap: wrap; }
@media (max-width: 720px) { header { align-items: start; flex-wrap: wrap; } }
</style>