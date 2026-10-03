<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Eye, EyeOff, Save, UserRound, UserRoundX } from "@lucide/vue";
import { createEmployee, getEmployeeNationalId, listAccessibleStores, listEmployees, updateEmployee, type Employee, type SaveEmployeeInput, type Store } from "../api";
import AddressFields, { type AddressFieldsValue } from "./AddressFields.vue";
import { staffSession } from "../../auth/session";

const route = useRoute();
const router = useRouter();
const editing = computed(() => Boolean(route.params.id));
const loading = ref(true);
const saving = ref(false);
const changingStatus = ref(false);
const loadingNationalId = ref(false);
const error = ref("");
const stores = ref<Array<Pick<Store, "id" | "name" | "active">>>([]);
const employee = ref<Employee | null>(null);
const nationalIdRevealed = ref(false);
const nationalIdTouched = ref(false);
const showNationalId = ref(false);
const showPassword = ref(false);
const address = ref<AddressFieldsValue>({ addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "España" });
interface EmployeeForm { email: string; displayName: string; role: "admin" | "technician"; password: string; defaultStoreId: string; storeAccess: string[] | null; phone: string; nationalId: string; }
const form = ref<EmployeeForm>({ email: "", displayName: "", role: "technician", password: "", defaultStoreId: "", storeAccess: [], phone: "", nationalId: "" });
const globalAdmin = computed({
  get: () => form.value.role === "admin" && form.value.storeAccess === null,
  set: (value: boolean) => {
    if (value) form.value.storeAccess = null;
    else form.value.storeAccess = form.value.defaultStoreId ? [form.value.defaultStoreId] : [];
  }
});
const selectedStores = computed({
  get: () => form.value.storeAccess ?? [],
  set: (ids: string[]) => {
    form.value.storeAccess = ids;
    if (form.value.defaultStoreId && !ids.includes(form.value.defaultStoreId)) form.value.defaultStoreId = ids[0] ?? "";
  }
});
const ownAccount = computed(() => editing.value && staffSession.value?.user.id === route.params.id);
const accessError = computed(() => form.value.role === "technician" && (!form.value.storeAccess?.length || !form.value.defaultStoreId || !form.value.storeAccess.includes(form.value.defaultStoreId))
  || form.value.role === "admin" && form.value.storeAccess !== null && (!form.value.storeAccess?.length || !form.value.defaultStoreId || !form.value.storeAccess.includes(form.value.defaultStoreId)));

function setRole(role: "admin" | "technician"): void {
  form.value.role = role;
  if (role === "admin" && !form.value.storeAccess?.length) form.value.storeAccess = null;
  if (role === "technician" && form.value.storeAccess === null) form.value.storeAccess = form.value.defaultStoreId ? [form.value.defaultStoreId] : [];
  if (role === "technician" && !form.value.defaultStoreId && stores.value[0]) {
    form.value.defaultStoreId = stores.value[0].id;
    form.value.storeAccess = [...new Set([...(form.value.storeAccess ?? []), stores.value[0].id])];
  }
}
async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    stores.value = await listAccessibleStores();
    if (editing.value) {
      employee.value = (await listEmployees()).find((item) => item.id === route.params.id) ?? null;
      if (!employee.value) throw new Error("No se encuentra el empleado.");
      form.value = {
        email: employee.value.email, displayName: employee.value.displayName, role: employee.value.role, password: "",
        defaultStoreId: employee.value.defaultStoreId ?? employee.value.storeId ?? "", storeAccess: employee.value.storeAccess !== undefined ? employee.value.storeAccess : employee.value.storeId ? [employee.value.storeId] : employee.value.role === "admin" ? null : [],
        phone: employee.value.phone ?? "", nationalId: ""
      };
      address.value = {
        addressStreet: employee.value.addressStreet ?? "", addressPostalCode: employee.value.addressPostalCode ?? "",
        addressCity: employee.value.addressCity ?? "", addressProvince: employee.value.addressProvince ?? "", addressCountry: employee.value.addressCountry ?? "España"
      };
    } else if (stores.value[0]) {
      form.value.defaultStoreId = stores.value[0].id;
      form.value.storeAccess = [stores.value[0].id];
    }
  } catch (reason) { error.value = (reason as Error).message; }
  finally { loading.value = false; }
}
async function revealNationalId(): Promise<void> {
  if (loadingNationalId.value) return;
  if (!nationalIdRevealed.value && editing.value) {
    loadingNationalId.value = true;
    try { form.value.nationalId = (await getEmployeeNationalId(String(route.params.id))).nationalId ?? ""; nationalIdTouched.value = true; nationalIdRevealed.value = true; }
    catch (reason) { error.value = (reason as Error).message; }
    finally { loadingNationalId.value = false; }
  } else {
    nationalIdRevealed.value = !nationalIdRevealed.value;
    nationalIdTouched.value = true;
  }
}
async function save(): Promise<void> {
  error.value = "";
  if (accessError.value) { error.value = "Incluye la tienda por defecto entre las tiendas permitidas."; return; }
  saving.value = true;
  const input: SaveEmployeeInput = {
    email: form.value.email.trim(), displayName: form.value.displayName.trim(), role: form.value.role,
    defaultStoreId: form.value.defaultStoreId || null, storeAccess: form.value.storeAccess,
    phone: form.value.phone.trim() || null, ...address.value,
    ...(nationalIdTouched.value ? { nationalId: form.value.nationalId.trim() || null } : {}),
    ...(form.value.password ? { password: form.value.password } : {})
  };
  try {
    if (editing.value) await updateEmployee(String(route.params.id), input);
    else await createEmployee({ ...input, password: form.value.password });
    await router.push({ name: "admin.employees.list" });
  } catch (reason) { error.value = (reason as Error).message; }
  finally { saving.value = false; }
}
async function changeActive(): Promise<void> {
  if (!employee.value || ownAccount.value) return;
  const active = !employee.value.active;
  if (!active && !window.confirm(`Dar de baja a ${employee.value.displayName}? Se conservaran sus operaciones.`)) return;
  changingStatus.value = true;
  error.value = "";
  try { employee.value = await updateEmployee(employee.value.id, { active: !employee.value.active }); }
  catch (reason) { error.value = (reason as Error).message; }
  finally { changingStatus.value = false; }
}
onMounted(load);
</script>

<template>
  <section class="employee-editor">
    <p class="breadcrumb"><RouterLink :to="{ name: 'admin.employees.list' }">Empleados</RouterLink> / {{ editing ? 'Ficha' : 'Alta' }}</p>
    <header><div><p class="eyebrow">Administracion</p><h1>{{ editing ? employee?.displayName ?? 'Editar empleado' : 'Nuevo empleado' }}</h1></div><button v-if="editing" class="secondary status-action" type="button" :disabled="changingStatus || ownAccount" @click="changeActive"><component :is="employee?.active ? UserRoundX : UserRound" :size="17" aria-hidden="true" />{{ changingStatus ? 'Actualizando...' : employee?.active ? 'Dar de baja' : 'Reactivar empleado' }}</button></header>
    <p v-if="loading" class="skeleton-row" aria-label="Cargando empleado" />
    <form v-else class="entity-form employee-form" @submit.prevent="save">
      <fieldset><legend>Datos del empleado</legend>
        <label>Nombre<input v-model="form.displayName" required maxlength="160" autocomplete="name" /></label>
        <label>Email de acceso<input v-model="form.email" type="email" required maxlength="320" autocomplete="email" /></label>
        <label>Telefono<input v-model="form.phone" type="tel" maxlength="80" autocomplete="tel" /></label>
        <label>Rol<select aria-label="Rol" :value="form.role" @change="setRole(($event.target as HTMLSelectElement).value as 'admin' | 'technician')"><option value="technician">Tecnico</option><option value="admin">Administrador</option></select></label>
        <label v-if="!editing">Contrasena inicial<span class="secret-input"><input v-model="form.password" :type="showPassword ? 'text' : 'password'" required minlength="12" maxlength="72" autocomplete="new-password" /><button type="button" :aria-label="showPassword ? 'Ocultar contrasena inicial' : 'Mostrar contrasena inicial'" @click="showPassword = !showPassword"><component :is="showPassword ? EyeOff : Eye" :size="18" aria-hidden="true" /></button></span></label>
        <label v-if="!editing">DNI/NIE (opcional)<span class="secret-input"><input v-model="form.nationalId" maxlength="32" :type="showNationalId ? 'text' : 'password'" autocomplete="off" @input="nationalIdTouched = true" /><button type="button" :aria-label="showNationalId ? 'Ocultar DNI/NIE' : 'Mostrar DNI/NIE'" :title="showNationalId ? 'Ocultar DNI/NIE' : 'Mostrar DNI/NIE'" @click="showNationalId = !showNationalId"><component :is="showNationalId ? EyeOff : Eye" :size="18" aria-hidden="true" /></button></span></label>
        <label v-else>DNI/NIE (solo administracion)<span class="secret-input"><input v-if="nationalIdRevealed" v-model="form.nationalId" maxlength="32" :type="showNationalId ? 'text' : 'password'" autocomplete="off" /><input v-else value="••••••••" readonly aria-label="DNI/NIE oculto" /><button type="button" :disabled="loadingNationalId" :aria-label="nationalIdRevealed ? (showNationalId ? 'Ocultar DNI/NIE' : 'Mostrar DNI/NIE') : 'Consultar DNI/NIE'" :title="nationalIdRevealed ? 'Mostrar u ocultar DNI/NIE' : 'Consultar DNI/NIE'" @click="nationalIdRevealed ? showNationalId = !showNationalId : revealNationalId()"><component :is="nationalIdRevealed && showNationalId ? EyeOff : Eye" :size="18" aria-hidden="true" /></button></span></label>
        <label v-if="editing && employee?.hiredAt">Fecha de alta<input :value="new Date(employee.hiredAt).toLocaleDateString('es-ES')" readonly /></label>
        <label v-if="editing && !employee?.active">Fecha de baja<input :value="employee?.deactivatedAt ? new Date(employee.deactivatedAt).toLocaleDateString('es-ES') : 'Historica'" readonly /></label>
      </fieldset>
      <fieldset class="store-assignment"><legend>Acceso a tiendas</legend>
        <label v-if="form.role === 'admin'" class="global-toggle"><input v-model="globalAdmin" type="checkbox" /> Administrador global (todas las tiendas, actuales y futuras)</label>
        <label>Tienda por defecto<select v-model="form.defaultStoreId" :required="form.role === 'technician' || !globalAdmin"><option value="">{{ globalAdmin ? 'Sin preseleccion' : 'Selecciona tienda' }}</option><option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option></select></label>
        <div v-if="!globalAdmin" class="store-options"><p>Tiendas permitidas</p><label v-for="store in stores" :key="store.id" class="store-option"><input v-model="selectedStores" type="checkbox" :value="store.id" />{{ store.name }}</label><p v-if="accessError" class="field-error">La tienda por defecto debe estar seleccionada.</p></div>
      </fieldset>
      <AddressFields v-model="address" />
      <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
      <footer><RouterLink class="button-link secondary" :to="{ name: 'admin.employees.list' }">Cancelar</RouterLink><button type="submit" :disabled="saving || Boolean(accessError)"><Save :size="16" aria-hidden="true" />{{ saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear empleado' }}</button></footer>
    </form>
  </section>
</template>

<style scoped>
.employee-editor { max-width: 1000px; }
header { align-items: end; margin: 18px 0 26px; }
h1 { font-size: 30px; overflow-wrap: anywhere; }
.employee-form { max-width: none; width: 100%; margin: 0; }
.employee-form fieldset { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.employee-form label, .employee-form input, .employee-form select { min-width: 0; }
.employee-form fieldset:disabled { opacity: .7; }
.status-action { align-items: center; display: inline-flex; gap: 8px; }
.store-assignment .global-toggle { display: flex; grid-column: 1 / -1; gap: 9px; align-items: center; }
.store-assignment .global-toggle input, .store-option input { width: 18px; height: 18px; accent-color: #49675a; }
.store-options { display: grid; gap: 8px; grid-column: 1 / -1; }
.store-options > p:first-child { margin: 0; color: #49675a; font-size: 12px; font-weight: 700; }
.store-option { align-items: center; background: #fff; border: 1px solid #d6dfda; border-radius: 4px; display: flex; gap: 10px; padding: 9px 10px; }
.store-option input { flex: 0 0 18px; }
.field-error { color: #a33424; font-size: 12px; }
.secret-input { display: flex; align-items: center; background: #fff; border: 1px solid #b5c9bd; border-radius: 4px; min-width: 0; }
.secret-input input { flex: 1; width: 0; border: 0; background: transparent; }
.secret-input button { align-items: center; background: transparent; color: #49675a; display: inline-flex; flex: 0 0 40px; height: 40px; justify-content: center; padding: 0; }
.secret-input button:hover { background: #edf3ef; }
.employee-form footer { position: sticky; bottom: 0; background: #edf3ef; padding: 14px 0; z-index: 2; }
@media (max-width: 600px) { .employee-form fieldset { grid-template-columns: 1fr; } }
</style>