<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { impersonateUser, listAccessibleStores, listEmployees, updateEmployee, type Employee, type Store } from "../api";
import { staffSession } from "../../auth/session";

const route = useRoute();
const router = useRouter();
const employees = ref<Employee[]>([]);
const stores = ref<Array<Pick<Store, "id" | "name" | "active">>>([]);
const error = ref("");
const busy = ref("");
const canImpersonate = computed(() => staffSession.value?.user.role === "admin" && (staffSession.value.user.storeAccess === null || (staffSession.value.user.storeAccess === undefined && !staffSession.value.user.storeId)));
const query = computed({ get: () => String(route.query.q ?? ""), set: (value: string) => { void router.replace({ query: { ...route.query, q: value || undefined } }); } });
const role = computed({ get: () => String(route.query.rol ?? ""), set: (value: string) => { void router.replace({ query: { ...route.query, rol: value || undefined } }); } });
const active = computed({ get: () => String(route.query.estado ?? ""), set: (value: string) => { void router.replace({ query: { ...route.query, estado: value || undefined } }); } });
const storeId = computed({ get: () => String(route.query.tienda ?? ""), set: (value: string) => { void router.replace({ query: { ...route.query, tienda: value || undefined } }); } });
const filtered = computed(() => employees.value.filter((employee) =>
  `${employee.displayName} ${employee.email} ${employee.phone ?? ""}`.toLocaleLowerCase().includes(query.value.toLocaleLowerCase()) &&
  (!role.value || employee.role === role.value) && (!active.value || String(employee.active) === active.value) &&
  (!storeId.value || employee.storeAccess?.includes(storeId.value) || employee.defaultStoreId === storeId.value)
));
function storeNames(employee: Employee): string {
  if (employee.storeAccess === null) return "Todas las tiendas";
  return (employee.storeAccess ?? (employee.storeId ? [employee.storeId] : [])).map((id) => `${id === employee.defaultStoreId ? "★ " : ""}${stores.value.find((store) => store.id === id)?.name ?? "Tienda eliminada"}`).join(", ") || "Sin tiendas";
}
async function load(): Promise<void> {
  error.value = "";
  try { [employees.value, stores.value] = await Promise.all([listEmployees(), listAccessibleStores()]); }
  catch (reason) { error.value = (reason as Error).message; }
}
async function setActive(employee: Employee): Promise<void> {
  const next = !employee.active;
  if (!next && !window.confirm(`Dar de baja a ${employee.displayName}? Sus operaciones historicas se conservaran.`)) return;
  busy.value = employee.id;
  error.value = "";
  try { await updateEmployee(employee.id, { active: next }); await load(); }
  catch (reason) { error.value = (reason as Error).message; }
  finally { busy.value = ""; }
}
async function impersonate(employee: Employee): Promise<void> {
  busy.value = employee.id;
  try { const session = await impersonateUser(employee.id); window.localStorage.setItem("xtechjs.staff-session", JSON.stringify(session)); window.location.reload(); }
  catch (reason) { error.value = (reason as Error).message; }
  finally { busy.value = ""; }
}
onMounted(load);
</script>

<template>
  <section class="employees-view">
    <header><div><p class="eyebrow">Administracion</p><h1>Empleados <span class="count">{{ filtered.length }}</span></h1></div><RouterLink class="button-link" :to="{ name: 'admin.employees.create' }">Nuevo empleado</RouterLink></header>
    <div class="filter-bar"><input v-model="query" aria-label="Buscar empleados" placeholder="Buscar por nombre, email o telefono" /><select v-model="storeId" aria-label="Tienda"><option value="">Todas las tiendas</option><option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option></select><select v-model="role" aria-label="Rol"><option value="">Todos los roles</option><option value="technician">Tecnico</option><option value="admin">Administrador</option></select><select v-model="active" aria-label="Estado"><option value="">Todos los estados</option><option value="true">Activos</option><option value="false">Baja</option></select><button v-if="query || storeId || role || active" class="secondary" type="button" @click="router.replace({ query: {} })">Limpiar filtros</button></div>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <div class="employee-table-wrap"><table class="employee-table"><thead><tr><th>Empleado</th><th>Rol</th><th>Tiendas</th><th>Contacto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      <tr v-for="employee in filtered" :key="employee.id"><td><RouterLink :to="{ name: 'admin.employees.edit', params: { id: employee.id } }"><strong>{{ employee.displayName }}</strong></RouterLink><small>Alta {{ employee.hiredAt ? new Date(employee.hiredAt).toLocaleDateString('es-ES') : 'historica' }}</small></td><td>{{ employee.role === 'admin' ? 'Administrador' : 'Tecnico' }}</td><td>{{ storeNames(employee) }}</td><td><span>{{ employee.email }}</span><small>{{ employee.phone || 'Sin telefono' }}</small></td><td><span :class="['status-pill', employee.active ? 'completed' : 'pending']">{{ employee.active ? 'Activo' : 'Baja' }}</span><small v-if="employee.deactivatedAt">{{ new Date(employee.deactivatedAt).toLocaleDateString('es-ES') }}</small></td><td class="employee-actions"><RouterLink class="secondary action-link" :to="{ name: 'admin.employees.edit', params: { id: employee.id } }">Editar</RouterLink><button class="secondary action-button" type="button" :disabled="busy === employee.id" @click="setActive(employee)">{{ employee.active ? 'Dar de baja' : 'Reactivar' }}</button><button v-if="canImpersonate && employee.active && employee.role !== 'admin'" class="secondary action-button" type="button" :disabled="busy === employee.id" @click="impersonate(employee)">Suplantar</button></td></tr>
      <tr v-if="!filtered.length"><td colspan="6" class="empty">{{ employees.length ? 'Ningun empleado coincide con los filtros.' : 'Aun no hay empleados registrados.' }}</td></tr>
    </tbody></table></div>
  </section>
</template>

<style scoped>
.employees-view { min-width: 0; }
header { align-items: end; margin-bottom: 20px; }
.employee-table-wrap { width: 100%; overflow-x: auto; }
.employee-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.employee-table th { border-bottom: 1px solid #cbd7d0; color: #698078; font-family: "DM Mono", monospace; font-size: 10px; font-weight: 500; padding: 10px 12px; text-transform: uppercase; }
.employee-table td { border-bottom: 1px solid #d6dfda; padding: 13px 12px; vertical-align: middle; }
.employee-table td:first-child { min-width: 150px; }
.employee-table td > small, .employee-table td > span + small { display: block; margin-top: 4px; }
.employee-table small { color: #698078; font-size: 11px; }
.employee-table td:first-child a { color: #173c36; text-decoration: none; }
.employee-table td:first-child a:hover { color: #b84732; }
.employee-actions { display: flex; flex-wrap: wrap; gap: 6px; min-width: 180px; }
.action-link, .action-button { border: 0; border-radius: 4px; color: #173c36; display: inline-flex; align-items: center; font-size: 11px; justify-content: center; padding: 7px 9px; text-decoration: none; white-space: nowrap; }
.employee-table .empty { color: #698078; padding: 28px 12px; text-align: center; }
@media (max-width: 720px) { .employee-table { min-width: 880px; } header { align-items: start; flex-direction: column; } }
</style>