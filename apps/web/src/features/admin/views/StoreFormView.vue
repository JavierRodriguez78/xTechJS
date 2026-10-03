<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createStore, listStores, updateStore, STORE_WEEK_DAYS, type StoreDayOpeningHours } from "../api";
import AddressFields, { type AddressFieldsValue } from "./AddressFields.vue";

const route = useRoute();
const router = useRouter();
const editing = computed(() => Boolean(route.params.id));
const error = ref("");
const loading = ref(editing.value);
const saving = ref(false);
const ready = ref(!editing.value);
const dayLabels = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
const weeklyHours = ref(STORE_WEEK_DAYS.map((day, index) => ({ day, label: dayLabels[index], open: false, opensAt: "", closesAt: "" })));
const weeklyConfigured = ref(!editing.value);
const form = ref({ name: "", legalName: "", addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "España", phone: "", email: "", taxId: "", openingHours: "", invoiceSeriesPrefix: "", logoUrl: "", veriFactuSystemId: "" });
const address = computed<AddressFieldsValue>({
  get: () => form.value,
  set: (value) => Object.assign(form.value, value)
});
const catalogLoading = ref(true);
const hasCoverage = ref(false);
const postalValid = ref(false);
function updateAddressCatalog(state: { loading: boolean; covered: boolean; postalValid: boolean }): void { catalogLoading.value = state.loading; hasCoverage.value = state.covered; postalValid.value = state.postalValid; }
onMounted(async () => {
  loading.value = true;
  try {
    if (editing.value) {
      const store = (await listStores()).find((item) => item.id === route.params.id);
      if (!store) throw new Error("No se encuentra la tienda.");
      for (const field of Object.keys(form.value) as Array<keyof typeof form.value>) form.value[field] = store[field] ?? "";
      if (store.weeklyOpeningHours) {
        weeklyConfigured.value = true;
        for (const day of weeklyHours.value) {
          const saved = store.weeklyOpeningHours.find((entry) => entry.day === day.day);
          if (saved) { day.open = saved.open; day.opensAt = saved.opensAt ?? ""; day.closesAt = saved.closesAt ?? ""; }
        }
      }
    }
    ready.value = true;
  } catch (reason) { error.value = (reason as Error).message; } finally { loading.value = false; }
});
async function save(): Promise<void> {
  error.value = "";
  if (weeklyConfigured.value) {
    const invalidDay = weeklyHours.value.find((day) => day.open && (!day.opensAt || !day.closesAt || day.closesAt <= day.opensAt));
    if (invalidDay) { error.value = `Revisa el horario de ${invalidDay.label}: el cierre debe ser posterior a la apertura y ambas horas son obligatorias.`; return; }
  }
  const input = {
    ...form.value,
    ...(weeklyConfigured.value ? { weeklyOpeningHours: weeklyHours.value.map((day): StoreDayOpeningHours => day.open
      ? { day: day.day, open: true, opensAt: day.opensAt, closesAt: day.closesAt }
      : { day: day.day, open: false, opensAt: null, closesAt: null }) } : {})
  };
  saving.value = true;
  try {
    if (editing.value) await updateStore(String(route.params.id), input);
    else await createStore(input);
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
        <label>Logo URL<input v-model="form.logoUrl" type="url" maxlength="2000" /></label>
      </fieldset>
      <fieldset @change="weeklyConfigured = true"><legend>Horario semanal</legend>
        <p v-if="form.openingHours && !weeklyConfigured" class="catalog-message">Horario anterior: {{ form.openingHours }}</p>
        <div class="weekly-schedule">
          <div v-for="day in weeklyHours" :key="day.day" class="schedule-day">
            <label class="day-toggle"><input v-model="day.open" type="checkbox" :aria-label="`${day.label} abierto`" />{{ day.label }}</label>
            <label>Apertura<input v-model="day.opensAt" type="time" :aria-label="`Apertura ${day.label}`" :disabled="!day.open" :required="day.open" /></label>
            <label>Cierre<input v-model="day.closesAt" type="time" :aria-label="`Cierre ${day.label}`" :disabled="!day.open" :required="day.open" :min="day.opensAt || undefined" /></label>
          </div>
        </div>
      </fieldset>
      <AddressFields v-model="address" :required="true" @catalog-state="updateAddressCatalog" />
      <p v-if="!hasCoverage" class="catalog-message error">El catalogo postal disponible cubre Espana.</p>
      <details><summary>Excepcion fiscal: emisor distinto del negocio</summary><fieldset><legend>Identidad fiscal propia (opcional)</legend><label>Razon social<input v-model="form.legalName" maxlength="200" /></label><label>NIF/CIF<input v-model="form.taxId" maxlength="80" /></label></fieldset></details>
      <details><summary>VeriFactu</summary><fieldset><legend>Identificacion (opcional)</legend><label>Identificador del sistema<input v-model="form.veriFactuSystemId" maxlength="120" /></label></fieldset></details>
      <footer><a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">Datos postales: GeoNames (CC BY)</a><RouterLink class="button-link secondary" :to="{ name: 'admin.stores.list' }">Cancelar</RouterLink><button :disabled="saving || catalogLoading || !hasCoverage || !postalValid">{{ saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear tienda' }}</button></footer>
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
.weekly-schedule { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 24px; }
.schedule-day { display: grid; grid-template-columns: minmax(0, 1fr) repeat(2, minmax(0, 1fr)); gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid #e0e7e2; }
.store-form .day-toggle { display: flex; flex-direction: row; align-items: center; gap: 8px; }
.store-form .day-toggle input { width: 18px; height: 18px; flex: 0 0 18px; padding: 0; accent-color: #49675a; }
.schedule-day input:disabled { background: #edf1ee; color: #748078; }
details { border-top: 1px solid #cbd7d0; padding-top: 16px; }
summary { color: #49675a; cursor: pointer; font-size: 14px; font-weight: 700; }
details fieldset { border-top: 0; margin-top: 18px; }
footer { flex-wrap: wrap; }
footer > a:first-child { color: #49675a; font-size: 11px; margin-right: auto; }
@media (max-width: 1000px) { .store-form fieldset { grid-template-columns: repeat(2, minmax(0, 1fr)); } .weekly-schedule { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .store-form fieldset { grid-template-columns: 1fr; } }
</style>