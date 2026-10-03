<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { repairStatusLabel } from "../../repairs/status-labels";
import { staffSession } from "../../auth/session";
import { listAccessibleStores, type Store } from "../api";

type Section = "attention" | "inventory" | "sales";
interface CountRow { status?: string; name?: string; type?: string; count: number; cents?: number; quantity?: number; }
interface ModuleSummary {
  total?: number;
  in_progress?: number;
  finished?: number;
  newCustomers?: number;
  repairsByStatus?: CountRow[];
  technicians?: CountRow[];
  inventoryItems?: number;
  lowStock?: number;
  stockPositionsByStatus?: CountRow[];
  movementsByType?: CountRow[];
  purchaseOrdersByStatus?: CountRow[];
  paidSales?: { count: number; cents: number };
  refundedSales?: { count: number; cents: number };
  salesByMethod?: CountRow[];
  salesByDay?: { date: string; cents: number }[];
  onlineSales?: { count: number; cents: number; unitsSold: number; topProducts: { name: string; quantity: number; cents: number }[] } | null;
}
const props = defineProps<{ section: Section }>();
const route = useRoute();
const router = useRouter();
const stores = ref<Array<Pick<Store, "id" | "name" | "active">>>([]);
const summary = ref<ModuleSummary | null>(null);
const loading = ref(true);
const error = ref("");
const isGlobalAdmin = computed(() => staffSession.value?.user.role === "admin" && (staffSession.value.user.storeAccess === null || (staffSession.value.user.storeAccess === undefined && !staffSession.value.user.storeId)));
const defaultStoreId = computed(() => isGlobalAdmin.value ? "" : staffSession.value?.user.defaultStoreId ?? staffSession.value?.user.storeId ?? "");
const storeId = ref(String(route.query.storeId ?? defaultStoreId.value));
const from = ref(String(route.query.from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)));
const to = ref(String(route.query.to ?? new Date().toISOString().slice(0, 10)));
const config: Record<Section, { label: string; title: string }> = {
  attention: { label: "Atención", title: "Clientes y reparaciones" },
  inventory: { label: "Almacén", title: "Stock y compras" },
  sales: { label: "Ventas", title: "Ventas y pedidos" }
};
const sectionInfo = computed(() => config[props.section]);
const money = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
const methodLabel: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };
const inventoryStatusLabel: Record<string, string> = { empty: "Sin existencias", low: "Bajo mínimo", healthy: "Disponible" };
const movementLabel: Record<string, string> = { receipt: "Recepción", adjustment: "Ajuste", consumption: "Consumo", transfer_in: "Traspaso recibido", transfer_out: "Traspaso enviado" };
const orderLabel: Record<string, string> = { draft: "Borrador", ordered: "Solicitado", received: "Recibido", cancelled: "Cancelado" };
const storeName = computed(() => stores.value.find((store) => store.id === storeId.value)?.name ?? "Todas las tiendas");

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const query = new URLSearchParams({ from: from.value, to: to.value });
    if (storeId.value) query.set("storeId", storeId.value);
    const response = await fetch(`/api/admin/dashboard/overview/${props.section}?${query}`, { headers: { authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` } });
    if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudo cargar el resumen." }))).message);
    summary.value = await response.json() as ModuleSummary;
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
}

function replaceQuery(): void { void router.replace({ query: { from: from.value, to: to.value, storeId: storeId.value || undefined } }); }
function barWidth(rows: CountRow[], count: number): string { return `${Math.max(3, Math.round(count / Math.max(...rows.map((row) => row.count), 1) * 100))}%`; }
function statusLabel(status?: string): string { return status ? repairStatusLabel(status) : "Sin clasificar"; }
function labelFor(row: CountRow[], value: string | undefined, kind: "status" | "method" | "movement" | "order" = "status"): string {
  if (!value) return "Sin clasificar";
  if (kind === "method") return methodLabel[value] ?? value;
  if (kind === "movement") return movementLabel[value] ?? value;
  if (kind === "order") return orderLabel[value] ?? value;
  return statusLabel(value);
}

watch([() => route.query, defaultStoreId], ([next]) => {
  from.value = String(next.from ?? from.value);
  to.value = String(next.to ?? to.value);
  storeId.value = String(next.storeId ?? defaultStoreId.value);
  void load();
}, { immediate: true });
onMounted(async () => {
  try {
    stores.value = await listAccessibleStores();
    if (!storeId.value && stores.value.length === 1 && !isGlobalAdmin.value) storeId.value = stores.value[0].id;
    replaceQuery();
  } catch (reason) { error.value = (reason as Error).message; }
});
</script>

<template>
  <section class="module-dashboard">
    <header><div><p class="eyebrow">{{ sectionInfo.label }}</p><h1>{{ sectionInfo.title }}</h1></div></header>
    <form class="filter-bar module-dashboard-filters" @submit.prevent="replaceQuery">
      <label v-if="stores.length > 1">Tienda<select v-model="storeId"><option value="">Todas mis tiendas</option><option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option></select></label>
      <input v-model="from" type="date" aria-label="Desde" /><input v-model="to" type="date" aria-label="Hasta" /><button type="submit">Actualizar</button>
    </form>
    <p class="module-dashboard-scope">{{ storeName }} · {{ from }} — {{ to }}</p>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <p v-if="loading" class="empty" aria-live="polite">Cargando indicadores...</p>

    <template v-else-if="summary && section === 'attention'">
      <div class="dashboard-metrics"><article><span>Reparaciones</span><strong>{{ summary.total ?? 0 }}</strong></article><article><span>En curso</span><strong>{{ summary.in_progress ?? 0 }}</strong></article><article><span>Finalizadas</span><strong>{{ summary.finished ?? 0 }}</strong></article><article><span>Clientes nuevos</span><strong>{{ summary.newCustomers ?? 0 }}</strong></article></div>
      <div class="dashboard-charts module-dashboard-charts"><section><h2>Reparaciones por estado</h2><div v-for="row in summary.repairsByStatus ?? []" :key="row.status" class="chart-row"><span>{{ statusLabel(row.status) }}</span><div><i :style="{ width: barWidth(summary.repairsByStatus ?? [], row.count) }" /></div><strong>{{ row.count }}</strong></div><p v-if="!summary.repairsByStatus?.length" class="empty">No hay reparaciones en este periodo.</p></section><section><h2>Reparaciones por técnico</h2><div v-for="row in summary.technicians ?? []" :key="row.name" class="chart-row"><span>{{ row.name }}</span><div><i :style="{ width: barWidth(summary.technicians ?? [], row.count) }" /></div><strong>{{ row.count }}</strong></div><p v-if="!summary.technicians?.length" class="empty">No hay reparaciones asignadas en este periodo.</p></section></div>
    </template>

    <template v-else-if="summary && section === 'inventory'">
      <div class="dashboard-metrics"><article><span>Artículos disponibles</span><strong>{{ summary.inventoryItems ?? 0 }}</strong></article><article><span>Alertas de stock</span><strong>{{ summary.lowStock ?? 0 }}</strong></article><article><span>Pedidos de compra</span><strong>{{ summary.purchaseOrdersByStatus?.reduce((total, row) => total + row.count, 0) ?? 0 }}</strong></article></div>
      <div class="dashboard-charts module-dashboard-charts"><section><h2>Saldos por estado</h2><div v-for="row in summary.stockPositionsByStatus ?? []" :key="row.status" class="chart-row"><span>{{ inventoryStatusLabel[row.status ?? ""] ?? row.status }}</span><div><i :style="{ width: barWidth(summary.stockPositionsByStatus ?? [], row.count) }" /></div><strong>{{ row.count }}</strong></div><p v-if="!summary.stockPositionsByStatus?.length" class="empty">No hay existencias por tienda en este periodo.</p></section><section><h2>Movimientos</h2><div v-for="row in summary.movementsByType ?? []" :key="row.type" class="chart-row"><span>{{ movementLabel[row.type ?? ""] ?? row.type }}</span><div><i :style="{ width: barWidth(summary.movementsByType ?? [], row.count) }" /></div><strong>{{ row.count }}</strong></div><p v-if="!summary.movementsByType?.length" class="empty">No hay movimientos en este periodo.</p></section><section><h2>Pedidos por estado</h2><div v-for="row in summary.purchaseOrdersByStatus ?? []" :key="row.status" class="chart-row"><span>{{ orderLabel[row.status ?? ""] ?? row.status }}</span><div><i :style="{ width: barWidth(summary.purchaseOrdersByStatus ?? [], row.count) }" /></div><strong>{{ row.count }}</strong></div><p v-if="!summary.purchaseOrdersByStatus?.length" class="empty">No hay pedidos de compra.</p></section></div>
    </template>

    <template v-else-if="summary && section === 'sales'">
      <div class="dashboard-metrics"><article><span>Cobros de reparaciones</span><strong>{{ money(summary.paidSales?.cents ?? 0) }}</strong><small>{{ summary.paidSales?.count ?? 0 }} cobros</small></article><article><span>Reembolsos</span><strong>{{ money(summary.refundedSales?.cents ?? 0) }}</strong><small>{{ summary.refundedSales?.count ?? 0 }} reembolsos</small></article><article v-if="summary.onlineSales"><span>Ventas online</span><strong>{{ money(summary.onlineSales.cents) }}</strong><small>{{ summary.onlineSales.count }} pedidos · {{ summary.onlineSales.unitsSold }} unidades</small></article></div>
      <div class="dashboard-charts module-dashboard-charts"><section><h2>Ventas por día</h2><div v-for="row in summary.salesByDay ?? []" :key="row.date" class="chart-row"><span>{{ row.date }}</span><div><i :style="{ width: `${Math.max(3, Math.round(row.cents / Math.max(...(summary.salesByDay ?? []).map((day) => day.cents), 1) * 100))}%` }" /></div><strong>{{ money(row.cents) }}</strong></div><p v-if="!summary.salesByDay?.length" class="empty">No hay cobros en este periodo.</p></section><section><h2>Cobros por método</h2><div v-for="row in summary.salesByMethod ?? []" :key="row.type" class="chart-row"><span>{{ methodLabel[row.type ?? ""] ?? row.type }}</span><div><i :style="{ width: barWidth(summary.salesByMethod ?? [], row.count) }" /></div><strong>{{ row.count }}</strong></div><p v-if="!summary.salesByMethod?.length" class="empty">No hay cobros en este periodo.</p></section><section v-if="summary.onlineSales"><h2>Productos online vendidos</h2><div v-for="row in summary.onlineSales.topProducts" :key="row.name" class="chart-row"><span>{{ row.name }}</span><div><i :style="{ width: `${Math.max(3, Math.round(row.quantity / Math.max(...summary.onlineSales.topProducts.map((product) => product.quantity), 1) * 100))}%` }" /></div><strong>{{ row.quantity }}</strong></div><p v-if="!summary.onlineSales.topProducts.length" class="empty">No hay productos vendidos en este periodo.</p></section></div>
      <p v-if="!summary.onlineSales" class="module-dashboard-note">Las ventas online no se atribuyen a tienda; solo se muestran en el panel del administrador global.</p>
    </template>
  </section>
</template>

<style scoped>
.module-dashboard { max-width: 1280px; min-width: 0; }
header { margin-bottom: 20px; }
.module-dashboard-filters label { color: #49675a; display: grid; font-size: 11px; font-weight: 700; gap: 5px; }
.module-dashboard-filters select { background: #fff; border: 1px solid #b5c9bd; border-radius: 4px; font: inherit; min-height: 42px; padding: 8px 10px; }
.module-dashboard-scope { color: #698078; font-size: 11px; margin: -12px 0 24px; }
.module-dashboard-charts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.module-dashboard-charts > section { min-width: 0; }
.module-dashboard-note { color: #698078; font-size: 12px; margin-top: 20px; }
@media (max-width: 900px) { .module-dashboard-charts { grid-template-columns: minmax(0, 1fr); } }
</style>
