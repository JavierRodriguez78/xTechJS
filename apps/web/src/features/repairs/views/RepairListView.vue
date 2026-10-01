<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppPagination from "../../../shared/components/AppPagination.vue";
import { getWorkflowConfig, listCustomers, listRepairs, listTechnicians, type RepairPage } from "../api";
import { repairStatusLabel } from "../status-labels";
import { chatUnreadByRepair } from "../../chat/notifications";

const route = useRoute();
const router = useRouter();
const result = ref<RepairPage>({ items: [], total: 0, page: 1, pageSize: 25 });
const statuses = ref<string[]>([]);
const deviceTypes = ref<string[]>([]);
const technicians = ref<{ id: string; displayName: string }[]>([]);
const customers = ref<{ id: string; displayName: string }[]>([]);
const loading = ref(true);
const error = ref("");
const query = ref("");
const status = ref("");
const technicianId = ref("");
const deviceType = ref("");
const customerId = ref("");
const receivedFrom = ref("");
const receivedTo = ref("");
const sort = ref<"createdAt:asc" | "createdAt:desc" | "brand:asc" | "brand:desc">("createdAt:desc");
const pageSize = ref(25);
let debounce: number | undefined;

const activeFilterCount = computed(() => [query.value, status.value, technicianId.value, deviceType.value, customerId.value, receivedFrom.value, receivedTo.value].filter(Boolean).length);
const hasFilters = computed(() => activeFilterCount.value > 0 || sort.value !== "createdAt:desc");

async function load(): Promise<void> {
	loading.value = true;
	error.value = "";
	try {
		result.value = await listRepairs({ q: query.value || undefined, estado: status.value || undefined, tecnico: technicianId.value || undefined, tipo: deviceType.value || undefined, cliente: customerId.value || undefined, desde: receivedFrom.value || undefined, hasta: receivedTo.value || undefined, orden: sort.value, pagina: Number(route.query.pagina ?? 1), pageSize: pageSize.value });
	} catch (reason) {
		error.value = (reason as Error).message;
	} finally {
		loading.value = false;
	}
}

async function loadFilterOptions(): Promise<void> {
	try {
		const [config, technicianOptions, customerPage] = await Promise.all([getWorkflowConfig(), listTechnicians(), listCustomers()]);
		statuses.value = config.statuses;
		deviceTypes.value = config.deviceTypes;
		technicians.value = technicianOptions;
		customers.value = customerPage.items;
	} catch (reason) {
		error.value = (reason as Error).message;
	}
}

function replaceQuery(page = 1): void {
	void router.replace({ query: { q: query.value || undefined, estado: status.value || undefined, tecnico: technicianId.value || undefined, tipo: deviceType.value || undefined, cliente: customerId.value || undefined, desde: receivedFrom.value || undefined, hasta: receivedTo.value || undefined, orden: sort.value === "createdAt:desc" ? undefined : sort.value, pagina: page === 1 ? undefined : String(page), pageSize: pageSize.value === 25 ? undefined : String(pageSize.value) } });
}

function syncFilters(): void {
	window.clearTimeout(debounce);
	debounce = window.setTimeout(() => replaceQuery(), 300);
}

function clear(): void {
	query.value = "";
	status.value = "";
	technicianId.value = "";
	deviceType.value = "";
	customerId.value = "";
	receivedFrom.value = "";
	receivedTo.value = "";
	sort.value = "createdAt:desc";
}

watch(() => route.query, (next) => {
	query.value = String(next.q ?? "");
	status.value = String(next.estado ?? "");
	technicianId.value = String(next.tecnico ?? "");
	deviceType.value = String(next.tipo ?? "");
	customerId.value = String(next.cliente ?? "");
	receivedFrom.value = String(next.desde ?? "");
	receivedTo.value = String(next.hasta ?? "");
	sort.value = (next.orden as typeof sort.value) || "createdAt:desc";
	pageSize.value = Number(next.pageSize ?? 25);
	void load();
}, { immediate: true });
watch([query, status, technicianId, deviceType, customerId, receivedFrom, receivedTo, sort], syncFilters);
onMounted(() => void loadFilterOptions());
</script>
<template>
	<section>
		<header><div><p class="eyebrow">Taller</p><h1>Reparaciones <span class="count">{{ result.total }}</span></h1></div><RouterLink class="button-link" :to="{ name: 'repairs.create' }">Nueva reparacion</RouterLink></header>
		<div class="filter-bar">
			<input v-model="query" placeholder="Buscar marca, modelo, serie o averia" />
			<select v-model="status"><option value="">Todos los estados</option><option v-for="item in statuses" :key="item" :value="item">{{ repairStatusLabel(item) }}</option></select>
			<select v-model="technicianId"><option value="">Todos los tecnicos</option><option v-for="technician in technicians" :key="technician.id" :value="technician.id">{{ technician.displayName }}</option></select>
			<select v-model="deviceType"><option value="">Todos los equipos</option><option v-for="item in deviceTypes" :key="item" :value="item">{{ item }}</option></select>
			<select v-model="customerId"><option value="">Todos los clientes</option><option v-for="customer in customers" :key="customer.id" :value="customer.id">{{ customer.displayName }}</option></select>
			<label>Desde<input v-model="receivedFrom" type="date" /></label><label>Hasta<input v-model="receivedTo" type="date" /></label>
			<select v-model="sort"><option value="createdAt:desc">Mas recientes</option><option value="createdAt:asc">Mas antiguas</option><option value="brand:asc">Marca A-Z</option><option value="brand:desc">Marca Z-A</option></select>
			<button v-if="hasFilters" class="secondary" type="button" @click="clear">Limpiar filtros<span v-if="activeFilterCount"> ({{ activeFilterCount }})</span></button>
		</div>
		<p v-if="error" class="feedback error">{{ error }} <button class="secondary" @click="load">Reintentar</button></p>
		<div v-else class="customer-list">
			<div v-if="loading" v-for="item in pageSize" :key="item" class="skeleton-row" />
			<p v-else-if="!result.total" class="empty">{{ hasFilters ? "Ninguna reparacion coincide con los filtros." : "Aun no hay reparaciones registradas." }}</p>
			<RouterLink v-else v-for="repair in result.items" :key="repair.id" class="customer-row" :to="{ name: 'repairs.detail.general', params: { id: repair.id } }"><strong>{{ repair.brand }} {{ repair.model }}</strong><span>{{ repair.deviceType }}</span><span>{{ repair.reportedIssue }}</span><span class="status-pill">{{ repairStatusLabel(repair.status) }}</span><span v-if="chatUnreadByRepair[repair.id]" class="chat-badge">{{ chatUnreadByRepair[repair.id] }}</span></RouterLink>
		</div>
		<AppPagination :page="result.page" :page-size="result.pageSize" :total="result.total" @change="replaceQuery" @page-size-change="(size) => { pageSize = size; replaceQuery(); }" />
	</section>
</template>
