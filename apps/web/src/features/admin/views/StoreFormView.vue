<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createStore, listStores, updateStore, listAddressCountries, listAddressProvinces, listAddressPlaces, type AddressCountry, type AddressProvince, type AddressPlace } from "../api";

const route = useRoute();
const router = useRouter();
const editing = computed(() => Boolean(route.params.id));
const error = ref("");
const loading = ref(editing.value);
const saving = ref(false);
const ready = ref(!editing.value);
const countries = ref<AddressCountry[]>([]);
const provinces = ref<AddressProvince[]>([]);
const places = ref<AddressPlace[]>([]);
const countryCode = ref("ES");
const provinceCode = ref("");
const cityQuery = ref("");
const catalogLoading = ref(false);
const catalogError = ref("");
let requestVersion = 0;
const cities = computed(() => [...new Set(places.value.map((place) => place.city))].filter((city) => city.toLocaleLowerCase("es").includes(cityQuery.value.toLocaleLowerCase("es")) || city === form.value.addressCity));
const postalCodes = computed(() => [...new Set(places.value.filter((place) => place.city === form.value.addressCity).map((place) => place.postalCode))]);
const hasCoverage = computed(() => countries.value.find((country) => country.code === countryCode.value)?.postalCoverage === true);
const form = ref({ name: "", legalName: "", addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "España", phone: "", email: "", taxId: "", openingHours: "", invoiceSeriesPrefix: "", logoUrl: "", veriFactuSystemId: "" });
onMounted(async () => {
  loading.value = true;
  try {
    countries.value = await listAddressCountries();
    if (editing.value) {
      const store = (await listStores()).find((item) => item.id === route.params.id);
      if (!store) throw new Error("No se encuentra la tienda.");
      for (const field of Object.keys(form.value) as Array<keyof typeof form.value>) form.value[field] = store[field] ?? "";
    }
    countryCode.value = countries.value.find((country) => country.name === form.value.addressCountry)?.code ?? "";
    if (countryCode.value) provinces.value = await listAddressProvinces(countryCode.value);
    provinceCode.value = provinces.value.find((province) => province.name === form.value.addressProvince)?.code ?? "";
    if (provinceCode.value) places.value = await listAddressPlaces(provinceCode.value);
    ready.value = true;
  } catch (reason) { error.value = (reason as Error).message; } finally { loading.value = false; }
});
async function changeCountry(): Promise<void> {
  const version = ++requestVersion;
  form.value.addressCountry = countries.value.find((country) => country.code === countryCode.value)?.name ?? "";
  provinceCode.value = "";
  form.value.addressProvince = "";
  form.value.addressCity = "";
  form.value.addressPostalCode = "";
  cityQuery.value = "";
  provinces.value = [];
  places.value = [];
  catalogError.value = "";
  catalogLoading.value = true;
  try { const result = await listAddressProvinces(countryCode.value); if (version === requestVersion) provinces.value = result; }
  catch (reason) { if (version === requestVersion) catalogError.value = (reason as Error).message; }
  finally { if (version === requestVersion) catalogLoading.value = false; }
}
async function changeProvince(): Promise<void> {
  const version = ++requestVersion;
  form.value.addressProvince = provinces.value.find((province) => province.code === provinceCode.value)?.name ?? "";
  form.value.addressCity = "";
  form.value.addressPostalCode = "";
  cityQuery.value = "";
  places.value = [];
  catalogError.value = "";
  if (!provinceCode.value) { catalogLoading.value = false; return; }
  catalogLoading.value = true;
  try { const result = await listAddressPlaces(provinceCode.value); if (version === requestVersion) places.value = result; }
  catch (reason) { if (version === requestVersion) catalogError.value = (reason as Error).message; }
  finally { if (version === requestVersion) catalogLoading.value = false; }
}
function changeCity(): void { form.value.addressPostalCode = postalCodes.value.length === 1 ? postalCodes.value[0] : ""; }
async function save(): Promise<void> {
  saving.value = true;
  error.value = "";
  try {
    if (editing.value) await updateStore(String(route.params.id), form.value);
    else await createStore(form.value);
    await router.push({ name: 'admin.stores.list' });
  } catch (reason) { error.value = (reason as Error).message; } finally { saving.value = false; }
}
</script>

<template>
  <section>
    <p class="breadcrumb"><RouterLink :to="{ name: 'admin.stores.list' }">Tiendas</RouterLink> / {{ editing ? 'Editar' : 'Nueva tienda' }}</p>
    <header><div><p class="eyebrow">Administracion</p><h1>{{ editing ? 'Editar tienda' : 'Nueva tienda' }}</h1></div></header>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <div v-if="loading" class="skeleton-row" aria-label="Cargando tienda" />
    <form v-else-if="ready" class="entity-form store-form" @submit.prevent="save">
      <fieldset><legend>Establecimiento</legend>
        <label>Nombre comercial<input v-model="form.name" required maxlength="160" /></label>
        <label>Prefijo de serie<input v-model="form.invoiceSeriesPrefix" required maxlength="32" placeholder="VLC-" /></label>
        <label>Email<input v-model="form.email" type="email" maxlength="320" /></label>
        <label>Telefono<input v-model="form.phone" type="tel" maxlength="80" /></label>
        <label>Horario<input v-model="form.openingHours" maxlength="500" /></label>
        <label>Logo URL<input v-model="form.logoUrl" type="url" maxlength="2000" /></label>
      </fieldset>
      <fieldset><legend>Direccion del establecimiento</legend>
        <label class="wide">Via y numero<input v-model="form.addressStreet" required maxlength="500" autocomplete="street-address" /></label>
        <label>Pais<select v-model="countryCode" required @change="changeCountry"><option disabled value="">Selecciona un pais</option><option v-for="country in countries" :key="country.code" :value="country.code">{{ country.name }}</option></select></label>
        <label>Provincia<select v-model="provinceCode" required :disabled="!hasCoverage || catalogLoading" @change="changeProvince"><option value="">Selecciona una provincia</option><option v-for="province in provinces" :key="province.code" :value="province.code">{{ province.name }}</option></select></label>
        <label>Buscar poblacion<input v-model="cityQuery" :disabled="!places.length" type="search" /></label>
        <label>Poblacion<select v-model="form.addressCity" required :disabled="!places.length || catalogLoading" @change="changeCity"><option value="">Selecciona una poblacion</option><option v-if="form.addressCity && !places.some((place) => place.city === form.addressCity)" :value="form.addressCity" disabled>{{ form.addressCity }} (dato historico)</option><option v-for="city in cities" :key="city" :value="city">{{ city }}</option></select></label>
        <label>Codigo postal<select v-model="form.addressPostalCode" required :disabled="!postalCodes.length"><option value="">Selecciona un codigo postal</option><option v-for="postalCode in postalCodes" :key="postalCode" :value="postalCode">{{ postalCode }}</option></select></label>
        <p v-if="catalogLoading" class="catalog-message" role="status">Cargando direcciones...</p>
        <p v-if="!hasCoverage" class="catalog-message error">El catalogo postal disponible cubre Espana.</p>
        <p v-if="catalogError" class="catalog-message error" role="alert">{{ catalogError }}</p>
      </fieldset>
      <details><summary>Excepcion fiscal: emisor distinto del negocio</summary><fieldset><legend>Identidad fiscal propia (opcional)</legend><label>Razon social<input v-model="form.legalName" maxlength="200" /></label><label>NIF/CIF<input v-model="form.taxId" maxlength="80" /></label></fieldset></details>
      <details><summary>VeriFactu</summary><fieldset><legend>Identificacion (opcional)</legend><label>Identificador del sistema<input v-model="form.veriFactuSystemId" maxlength="120" /></label></fieldset></details>
      <footer><a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">Datos postales: GeoNames (CC BY)</a><RouterLink class="button-link secondary" :to="{ name: 'admin.stores.list' }">Cancelar</RouterLink><button :disabled="saving || catalogLoading || !hasCoverage || !postalCodes.includes(form.addressPostalCode)">{{ saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear tienda' }}</button></footer>
    </form>
  </section>
</template>

<style scoped>
header { margin: 18px 0 28px; }
h1 { font-size: 30px; }
.store-form { margin: 0; max-width: none; width: 100%; }
.store-form fieldset { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.store-form label, .store-form input, .store-form select { min-width: 0; }
.catalog-message { grid-column: 1 / -1; font-size: 13px; margin: 0; }
.wide { grid-column: 1 / -1; }
details { border-top: 1px solid #cbd7d0; padding-top: 16px; }
summary { color: #49675a; cursor: pointer; font-size: 14px; font-weight: 700; }
details fieldset { border-top: 0; margin-top: 18px; }
footer { flex-wrap: wrap; }
footer > a:first-child { color: #49675a; font-size: 11px; margin-right: auto; }
@media (max-width: 1000px) { .store-form fieldset { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .store-form fieldset { grid-template-columns: 1fr; } }
</style>