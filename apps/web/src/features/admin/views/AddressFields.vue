<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { listAddressCountries, listAddressPlaces, listAddressProvinces, type AddressCountry, type AddressPlace, type AddressProvince } from "../api";

export interface AddressFieldsValue {
  addressStreet: string;
  addressPostalCode: string;
  addressCity: string;
  addressProvince: string;
  addressCountry: string;
}
interface AddressCatalogState { loading: boolean; covered: boolean; postalValid: boolean }
const props = withDefaults(defineProps<{ required?: boolean; legend?: string; publicCatalog?: boolean; readonlyFields?: Partial<Record<keyof AddressFieldsValue, boolean>> }>(), { required: false, legend: "Direccion", publicCatalog: false });
const emit = defineEmits<{ catalogState: [state: AddressCatalogState] }>();
const address = defineModel<AddressFieldsValue>({ required: true });
const countries = ref<AddressCountry[]>([]);
const provinces = ref<AddressProvince[]>([]);
const places = ref<AddressPlace[]>([]);
const countryCode = ref("");
const provinceCode = ref("");
const cityQuery = ref("");
const loading = ref(false);
const error = ref("");
let requestVersion = 0;
const isSpanishCatalog = computed(() => countryCode.value === "ES");
const cities = computed(() => [...new Set(places.value.map((place) => place.city))].filter((city) => city.toLocaleLowerCase("es").includes(cityQuery.value.toLocaleLowerCase("es")) || city === address.value.addressCity));
const postalCodes = computed(() => [...new Set(places.value.filter((place) => place.city === address.value.addressCity).map((place) => place.postalCode))]);
const postalValid = computed(() => !isSpanishCatalog.value || postalCodes.value.includes(address.value.addressPostalCode));
const historicProvince = computed(() => Boolean(address.value.addressProvince) && !provinces.value.some((province) => province.name === address.value.addressProvince));

function notifyCatalogState(): void { emit("catalogState", { loading: loading.value, covered: isSpanishCatalog.value, postalValid: postalValid.value }); }
watch([loading, isSpanishCatalog, postalValid], notifyCatalogState, { immediate: true });
async function loadProvinces(): Promise<void> {
  const request = ++requestVersion;
  provinces.value = [];
  places.value = [];
  if (!countryCode.value) return;
  loading.value = true;
  try {
    const result = await listAddressProvinces(countryCode.value, props.publicCatalog);
    if (request === requestVersion) provinces.value = result;
  } catch (reason) { if (request === requestVersion) error.value = (reason as Error).message; }
  finally { if (request === requestVersion) loading.value = false; }
}
async function loadPlaces(): Promise<void> {
  const request = ++requestVersion;
  places.value = [];
  if (!provinceCode.value) return;
  loading.value = true;
  try {
    const result = await listAddressPlaces(provinceCode.value, props.publicCatalog);
    if (request === requestVersion) places.value = result;
  } catch (reason) { if (request === requestVersion) error.value = (reason as Error).message; }
  finally { if (request === requestVersion) loading.value = false; }
}
async function changeCountry(): Promise<void> {
  address.value.addressCountry = countries.value.find((country) => country.code === countryCode.value)?.name ?? "";
  address.value.addressProvince = "";
  address.value.addressCity = "";
  address.value.addressPostalCode = "";
  provinceCode.value = "";
  cityQuery.value = "";
  error.value = "";
  await loadProvinces();
}
async function changeProvince(): Promise<void> {
  address.value.addressProvince = provinces.value.find((province) => province.code === provinceCode.value)?.name ?? "";
  address.value.addressCity = "";
  address.value.addressPostalCode = "";
  cityQuery.value = "";
  error.value = "";
  await loadPlaces();
}
function changeCity(): void { address.value.addressPostalCode = postalCodes.value.length === 1 ? postalCodes.value[0] : ""; }

onMounted(async () => {
  loading.value = true;
  try {
    countries.value = await listAddressCountries(props.publicCatalog);
    countryCode.value = countries.value.find((country) => country.name === address.value.addressCountry)?.code ?? "";
    if (!countryCode.value) return;
    provinces.value = await listAddressProvinces(countryCode.value, props.publicCatalog);
    provinceCode.value = provinces.value.find((province) => province.name === address.value.addressProvince)?.code ?? "";
    if (provinceCode.value) places.value = await listAddressPlaces(provinceCode.value, props.publicCatalog);
  } catch (reason) { error.value = (reason as Error).message; }
  finally { loading.value = false; }
});
watch(() => address.value.addressCountry, (country) => {
  if (countries.value.length && countries.value.find((item) => item.name === country)?.code !== countryCode.value) {
    countryCode.value = countries.value.find((item) => item.name === country)?.code ?? "";
  }
});
</script>

<template>
  <fieldset class="address-fields">
    <legend>{{ legend }}</legend>
    <label class="wide">Via y numero<input v-model="address.addressStreet" maxlength="500" autocomplete="street-address" :required="required" :readonly="readonlyFields?.addressStreet" /></label>
    <label>Pais<select v-model="countryCode" :required="required" :disabled="readonlyFields?.addressCountry" @change="changeCountry"><option value="">Selecciona un pais</option><option v-for="country in countries" :key="country.code" :value="country.code">{{ country.name }}</option></select></label>
    <template v-if="isSpanishCatalog">
      <label v-if="historicProvince">Provincia<input v-model="address.addressProvince" maxlength="120" :required="required" :readonly="readonlyFields?.addressProvince" /></label>
      <label v-else>Provincia<select v-model="provinceCode" :disabled="loading || readonlyFields?.addressProvince" :required="required" @change="changeProvince"><option value="">Selecciona una provincia</option><option v-for="province in provinces" :key="province.code" :value="province.code">{{ province.name }}</option></select></label>
      <label>Buscar poblacion<input v-model="cityQuery" type="search" :disabled="!places.length || readonlyFields?.addressCity" /></label>
      <label v-if="places.length || !address.addressCity">Poblacion<select v-model="address.addressCity" :disabled="!places.length || readonlyFields?.addressCity" :required="required" @change="changeCity"><option value="">Selecciona una poblacion</option><option v-if="address.addressCity && !places.some((place) => place.city === address.addressCity)" :value="address.addressCity" disabled>{{ address.addressCity }} (dato historico)</option><option v-for="city in cities" :key="city" :value="city">{{ city }}</option></select></label>
      <label v-else>Poblacion<input v-model="address.addressCity" maxlength="120" :required="required" :readonly="readonlyFields?.addressCity" /></label>
      <label v-if="postalCodes.length">Codigo postal<select v-model="address.addressPostalCode" :required="required" :disabled="readonlyFields?.addressPostalCode"><option value="">Selecciona un codigo postal</option><option v-for="postal in postalCodes" :key="postal" :value="postal">{{ postal }}</option></select></label>
      <label v-else>Codigo postal<input v-model="address.addressPostalCode" maxlength="20" inputmode="numeric" :required="required" :readonly="readonlyFields?.addressPostalCode" /></label>
    </template>
    <template v-else>
      <label>Provincia<input v-model="address.addressProvince" maxlength="120" :required="required" :readonly="readonlyFields?.addressProvince" /></label>
      <label>Poblacion<input v-model="address.addressCity" maxlength="120" :required="required" :readonly="readonlyFields?.addressCity" /></label>
      <label>Codigo postal<input v-model="address.addressPostalCode" maxlength="20" :required="required" :readonly="readonlyFields?.addressPostalCode" /></label>
    </template>
    <p v-if="loading" class="catalog-status" role="status">Cargando catalogo postal...</p>
    <p v-if="error" class="catalog-status error" role="alert">{{ error }}</p>
  </fieldset>
</template>

<style scoped>
.address-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.address-fields label, .address-fields input, .address-fields select { min-width: 0; }
.wide, .catalog-status { grid-column: 1 / -1; }
.catalog-status { margin: 0; font-size: 12px; }
@media (max-width: 600px) { .address-fields { grid-template-columns: 1fr; } }
</style>
