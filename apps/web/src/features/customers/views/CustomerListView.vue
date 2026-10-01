<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppPagination from "../../../shared/components/AppPagination.vue";
import { listCustomers, type CustomerPage } from "../api";

const route = useRoute();
const router = useRouter();
const result = ref<CustomerPage>({ items: [], total: 0, page: 1, pageSize: 25 });
const loading = ref(true);
const error = ref("");
const query = ref("");
const status = ref("");
const tag = ref("");
const createdFrom = ref("");
const createdTo = ref("");
const sort = ref<"displayName:asc" | "displayName:desc" | "createdAt:asc" | "createdAt:desc">("createdAt:desc");
const pageSize = ref(25);
let debounce: number | undefined;

const tags = computed(() => [...new Set(result.value.items.flatMap((customer) => customer.tags))].sort());
const activeFilterCount = computed(() => [query.value, status.value, tag.value, createdFrom.value, createdTo.value].filter(Boolean).length);
const hasFilters = computed(() => activeFilterCount.value > 0 || sort.value !== "createdAt:desc");

async function load(): Promise<void> {
	loading.value = true;
	error.value = "";
	try {
		result.value = await listCustomers({ q: query.value || undefined, estado: status.value as "pending" | "completed" | undefined, etiqueta: tag.value || undefined, desde: createdFrom.value || undefined, hasta: createdTo.value || undefined, orden: sort.value, pagina: Number(route.query.pagina ?? 1), pageSize: pageSize.value });
	} catch (reason) {
		error.value = (reason as Error).message;
	} finally {
		loading.value = false;
	}
}

function replaceQuery(page = 1): void {
	void router.replace({ query: { q: query.value || undefined, estado: status.value || undefined, etiqueta: tag.value || undefined, desde: createdFrom.value || undefined, hasta: createdTo.value || undefined, orden: sort.value === "createdAt:desc" ? undefined : sort.value, pagina: page === 1 ? undefined : String(page), pageSize: pageSize.value === 25 ? undefined : String(pageSize.value) } });
}

function syncFilters(): void {
	window.clearTimeout(debounce);
	debounce = window.setTimeout(() => replaceQuery(), 300);
}

function clear(): void {
	query.value = "";
	status.value = "";
	tag.value = "";
	createdFrom.value = "";
	createdTo.value = "";
	sort.value = "createdAt:desc";
}

watch(() => route.query, (next) => {
	query.value = String(next.q ?? "");
	status.value = String(next.estado ?? "");
	tag.value = String(next.etiqueta ?? "");
	createdFrom.value = String(next.desde ?? "");
	createdTo.value = String(next.hasta ?? "");
	sort.value = (next.orden as typeof sort.value) || "createdAt:desc";
	pageSize.value = Number(next.pageSize ?? 25);
	void load();
}, { immediate: true });
watch([query, status, tag, createdFrom, createdTo, sort], syncFilters);
</script>
<template>
	<section class="customers-view">
		<header><div><p class="eyebrow">CRM</p><h1>Clientes <span class="count">{{ result.total }}</span></h1></div><RouterLink class="button-link" :to="{ name: 'customers.create' }">Nuevo cliente</RouterLink></header>
		<div class="filter-bar">
			<input v-model="query" placeholder="Buscar por nombre, email, telefono o NIF" />
			<select v-model="status"><option value="">Todos los estados</option><option value="pending">Pendiente</option><option value="completed">Completado</option></select>
			<select v-model="tag"><option value="">Todas las etiquetas</option><option v-for="item in tags" :key="item" :value="item">{{ item }}</option></select>
			<label>Desde<input v-model="createdFrom" type="date" /></label><label>Hasta<input v-model="createdTo" type="date" /></label>
			<select v-model="sort"><option value="createdAt:desc">Más recientes</option><option value="createdAt:asc">Más antiguos</option><option value="displayName:asc">Nombre A-Z</option><option value="displayName:desc">Nombre Z-A</option></select>
			<button v-if="hasFilters" class="secondary" type="button" @click="clear">Limpiar filtros<span v-if="activeFilterCount"> ({{ activeFilterCount }})</span></button>
		</div>
		<p v-if="error" class="feedback error">{{ error }} <button class="secondary" @click="load">Reintentar</button></p>
		<div v-else class="customer-list">
			<div v-if="loading" v-for="item in pageSize" :key="item" class="skeleton-row" />
			<p v-else-if="!result.total" class="empty">{{ hasFilters ? "Ningun cliente coincide con los filtros." : "Aun no hay clientes registrados." }}</p>
			<RouterLink v-else v-for="customer in result.items" :key="customer.id" class="customer-row" :to="{ name: 'customers.detail.general', params: { id: customer.id } }"><strong>{{ customer.displayName }}</strong><span>{{ customer.email || customer.phone || "Sin contacto" }}</span><span>{{ customer.tags.join(", ") || "Sin etiquetas" }}</span><span :class="['status-pill', customer.registrationStatus]">{{ customer.registrationStatus === "pending" ? "Pendiente" : "Completado" }}</span></RouterLink>
		</div>
		<AppPagination :page="result.page" :page-size="result.pageSize" :total="result.total" @change="replaceQuery" @page-size-change="(size) => { pageSize = size; replaceQuery(); }" />
	</section>
</template>