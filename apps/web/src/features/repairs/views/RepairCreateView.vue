<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { staffSession } from "../../auth/session";
import { listAccessibleStores, type Store } from "../../admin/api";
import { createRepair, getWorkflowConfig, listCustomers, listTechnicians } from "../api";

type IntakeCustomer = { id: string; displayName: string; email?: string | null; phone?: string | null };
const router = useRouter();
const customers = ref<IntakeCustomer[]>([]);
const selectedCustomer = ref<IntakeCustomer | null>(null);
const customerQuery = ref("");
const technicians = ref<{ id: string; displayName: string; storeAccess?: string[] | null; defaultStoreId?: string | null }[]>([]);
const stores = ref<Array<Pick<Store, "id" | "name" | "active">>>([]);
const deviceTypes = ref<string[]>([]);
const deviceCatalog = ref<{ deviceType: string; brand: string; model: string; imageUrl?: string }[]>([]);
const catalogStep = ref<"brands" | "models" | null>(null);
const selectedBrand = ref("");
const showPasscode = ref(false);
const form = ref({ customerId: "", storeId: staffSession.value?.user.defaultStoreId ?? staffSession.value?.user.storeId ?? "", deviceType: "", brand: "", model: "", serialNumber: "", reportedIssue: "", deliveredAccessories: "", devicePasscode: "", technicianId: "", estimatedCompletionAt: "", conditionNotes: "" });
const initialQuoteLines = ref<{ description: string; quantity: number; unitPriceCents: number }[]>([]);
const conditionItems = ref([{ label: "Pantalla", ok: true }, { label: "Botones fisicos", ok: true }, { label: "Bateria", ok: true }, { label: "Carcasa y golpes", ok: true }, { label: "Puertos de carga", ok: true }, { label: "Altavoz y microfono", ok: true }, { label: "Dano por liquido", ok: true }]);
const error = ref("");
const eligibleTechnicians = computed(() => technicians.value.filter((technician) => !form.value.storeId || technician.storeAccess === null || technician.storeAccess?.includes(form.value.storeId) || technician.defaultStoreId === form.value.storeId));
let customerSearchTimer: number | undefined;
watch(() => form.value.storeId, () => { if (!eligibleTechnicians.value.some((technician) => technician.id === form.value.technicianId)) form.value.technicianId = ""; });

async function loadCustomers(): Promise<void> { try { customers.value = (await listCustomers({ q: customerQuery.value })).items; } catch (reason) { error.value = (reason as Error).message; } }
function searchCustomers(): void { window.clearTimeout(customerSearchTimer); customerSearchTimer = window.setTimeout(() => void loadCustomers(), 250); }
function selectCustomer(customer: IntakeCustomer): void { selectedCustomer.value = customer; form.value.customerId = customer.id; }
function selectDeviceType(deviceType: string): void { form.value.deviceType = deviceType; form.value.brand = ""; form.value.model = ""; selectedBrand.value = ""; catalogStep.value = "brands"; }
function selectBrand(brand: string): void { selectedBrand.value = brand; catalogStep.value = "models"; }
function selectModel(model: { brand: string; model: string }): void { form.value.brand = model.brand; form.value.model = model.model; catalogStep.value = null; }
function catalogBrands(): string[] { return [...new Set(deviceCatalog.value.filter((entry) => entry.deviceType === form.value.deviceType).map((entry) => entry.brand))]; }
function canManageDeviceCatalog(): boolean { return staffSession.value?.user.role === "admin"; }
function openDeviceConfiguration(): void { void router.push({ name: "admin.config.devices" }); }
function addQuoteLine(): void { initialQuoteLines.value.push({ description: "", quantity: 1, unitPriceCents: 0 }); }
function removeQuoteLine(index: number): void { initialQuoteLines.value.splice(index, 1); }
function viewCustomerRepairs(): void { if (form.value.customerId) void router.push({ name: "repairs.list", query: { cliente: form.value.customerId } }); }
function createCustomer(): void { void router.push({ name: "customers.create" }); }
function cancel(): void { router.back(); }
async function save(): Promise<void> { error.value = ""; try { const repair = await createRepair({ ...form.value, storeId: form.value.storeId || undefined, serialNumber: form.value.serialNumber || undefined, deliveredAccessories: form.value.deliveredAccessories || undefined, devicePasscode: form.value.devicePasscode || undefined, technicianId: form.value.technicianId || undefined, estimatedCompletionAt: form.value.estimatedCompletionAt ? new Date(form.value.estimatedCompletionAt).toISOString() : undefined, initialQuoteLines: initialQuoteLines.value.length ? initialQuoteLines.value : undefined, preRepairCondition: { items: conditionItems.value, notes: form.value.conditionNotes || undefined } }); void router.push({ name: "repairs.detail.general", params: { id: repair.id } }); } catch (reason) { error.value = (reason as Error).message; } }

onMounted(async () => { try { const [config, staff, accessibleStores] = await Promise.all([getWorkflowConfig(), listTechnicians(), loadCustomers().then(() => listAccessibleStores())]); deviceTypes.value = config.deviceTypes; deviceCatalog.value = config.deviceCatalog ?? []; technicians.value = staff; stores.value = accessibleStores; if (!form.value.storeId && stores.value.length === 1) form.value.storeId = stores.value[0].id; } catch (reason) { error.value = (reason as Error).message; } });
</script>
<template>
	<form class="repair-intake" @submit.prevent="save">
		<header class="repair-intake-header"><div><p class="eyebrow">Recepcion</p><h1>Abrir ticket de reparacion</h1></div><button class="secondary" type="button" @click="cancel">Cancelar</button></header>
		<aside class="intake-cart">
			<section class="intake-section"><div class="intake-section-heading"><h2>Cliente</h2><button class="secondary" type="button" @click="createCustomer">Nuevo cliente</button></div><input v-model="customerQuery" data-test="customer-search" placeholder="Buscar nombre, email o telefono" @input="searchCustomers" /><div class="intake-customer-results"><button v-for="customer in customers" :key="customer.id" :class="['intake-customer-option', { selected: form.customerId === customer.id }]" type="button" @click="selectCustomer(customer)"><strong>{{ customer.displayName }}</strong><span>{{ customer.email || customer.phone || "Sin contacto" }}</span></button><p v-if="!customers.length" class="empty">No hay clientes para esta búsqueda.</p></div><div v-if="selectedCustomer" class="intake-selected-customer"><strong>{{ selectedCustomer.displayName }}</strong><span>{{ selectedCustomer.email || selectedCustomer.phone || "Sin contacto" }}</span></div></section>
			<section class="intake-section"><div class="intake-section-heading"><h2>Presupuesto inicial</h2><button class="secondary" type="button" @click="addQuoteLine">Añadir línea</button></div><p v-if="!initialQuoteLines.length" class="empty">Sin líneas iniciales.</p><div v-for="(line, index) in initialQuoteLines" :key="index" class="quote-line"><input v-model="line.description" placeholder="Concepto" required /><input v-model.number="line.quantity" type="number" min="1" max="1000" required aria-label="Cantidad" /><input v-model.number="line.unitPriceCents" type="number" min="0" required aria-label="Precio en centimos" /><button class="secondary" type="button" @click="removeQuoteLine(index)">Quitar</button></div></section>
		</aside>
		<main class="intake-workbench">
			<section class="intake-section"><p class="eyebrow">Tipo de reparacion</p><div class="repair-type-grid"><button v-for="deviceType in deviceTypes" :key="deviceType" :class="['repair-type-card', { selected: form.deviceType === deviceType }]" type="button" :aria-pressed="form.deviceType === deviceType" @click="selectDeviceType(deviceType)"><span>{{ deviceType.slice(0, 1) }}</span><strong>{{ deviceType }}</strong></button></div></section>
			<section class="intake-section intake-device-fields"><h2>Equipo y recepcion</h2><label v-if="staffSession?.user.role === 'admin' || stores.length > 1">Tienda<select v-model="form.storeId" required><option value="">Selecciona una tienda</option><option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option></select></label><label v-else>Tienda<input :value="stores[0]?.name ?? 'Sin tienda asignada'" disabled /></label><label>Marca<input v-model="form.brand" data-test="brand" required /></label><label>Modelo<input v-model="form.model" data-test="model" required /></label><label>Numero de serie<input v-model="form.serialNumber" /></label><label>Averia reportada<textarea v-model="form.reportedIssue" data-test="reported-issue" required rows="3" /></label><label>Accesorios entregados<input v-model="form.deliveredAccessories" /></label><label>PIN o patron de desbloqueo<span class="input-action"><input v-model="form.devicePasscode" :type="showPasscode ? 'text' : 'password'" autocomplete="off" /><button class="secondary" type="button" @click="showPasscode = !showPasscode">{{ showPasscode ? "Ocultar" : "Mostrar" }}</button></span></label><label>Tecnico asignado<select v-model="form.technicianId"><option value="">Sin asignar</option><option v-for="technician in eligibleTechnicians" :key="technician.id" :value="technician.id">{{ technician.displayName }}</option></select></label><label>Fecha estimada de finalizacion<input v-model="form.estimatedCompletionAt" type="datetime-local" /></label></section>
			<section class="intake-section intake-condition"><h2>Estado previo del equipo</h2><label v-for="item in conditionItems" :key="item.label" class="checkbox-row"><input v-model="item.ok" type="checkbox" /><span>{{ item.label }} correcto</span></label><label>Observaciones<textarea v-model="form.conditionNotes" rows="3" /></label></section>
			<p v-if="error" class="feedback error">{{ error }}</p>
			<footer class="intake-actions"><button class="secondary" type="button" :disabled="!form.customerId" @click="viewCustomerRepairs">Ver tickets</button><button class="secondary" type="button" @click="createCustomer">Nuevo cliente</button><button class="secondary" type="button" @click="cancel">Cancelar</button><button class="intake-create" :disabled="!form.customerId || !form.deviceType">Crear ticket</button></footer>
		</main>
		<section v-if="catalogStep" class="catalog-drawer" role="dialog" aria-modal="true"><header><div><p class="eyebrow">{{ form.deviceType }}</p><h2>{{ catalogStep === "brands" ? "Selecciona una marca" : `Modelos de ${selectedBrand}` }}</h2></div><button class="secondary" type="button" @click="catalogStep = null">Cerrar</button></header><div v-if="catalogStep === 'brands' && catalogBrands().length" class="catalog-choice-grid"><button v-for="brand in catalogBrands()" :key="brand" type="button" @click="selectBrand(brand)">{{ brand }}</button></div><div v-else-if="catalogStep === 'brands'" class="catalog-empty"><p>No hay marcas configuradas para {{ form.deviceType }}.</p><template v-if="canManageDeviceCatalog()"><p>Añade marcas, modelos e imágenes desde la configuración de dispositivos.</p><button type="button" @click="openDeviceConfiguration">Configurar catálogo</button></template><template v-else><label>Marca<input v-model="form.brand" autofocus /></label><label>Modelo<input v-model="form.model" /></label><button type="button" :disabled="!form.brand.trim() || !form.model.trim()" @click="catalogStep = null">Usar marca y modelo</button></template></div><div v-else class="catalog-choice-grid"><button v-for="entry in deviceCatalog.filter((item) => item.deviceType === form.deviceType && item.brand === selectedBrand)" :key="entry.model" class="catalog-model-card" type="button" @click="selectModel(entry)"><img v-if="entry.imageUrl" :src="entry.imageUrl" :alt="entry.model" /><span v-else>{{ entry.model.slice(0, 1) }}</span><strong>{{ entry.model }}</strong></button></div></section>
	</form>
</template>
