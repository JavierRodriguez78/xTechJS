<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppPagination from "../../../shared/components/AppPagination.vue";
import { listSupplierCatalog, listSuppliers, type CatalogItemAvailability, type Supplier, type SupplierCatalogPage } from "../api";

const route = useRoute();
const router = useRouter();
const suppliers = ref<Supplier[]>([]);
const result = ref<SupplierCatalogPage>({ items: [], total: 0, page: 1, pageSize: 25 });
const loading = ref(true);
const error = ref("");
const query = ref("");
const supplierId = ref("");
const category = ref("");
const brand = ref("");
const model = ref("");
const availability = ref<CatalogItemAvailability | "">("");
const priceMin = ref("");
const priceMax = ref("");
const labels: Record<CatalogItemAvailability, string> = { in_stock: "Disponible", out_of_stock: "Agotado", unknown: "Sin confirmar" };
const supplierNames = computed(() => new Map(suppliers.value.map((supplier) => [supplier.id, supplier.name])));
const hasFilters = computed(() => Boolean(query.value || supplierId.value || category.value || brand.value || model.value || availability.value || priceMin.value || priceMax.value));

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    result.value = await listSupplierCatalog({ q: query.value || undefined, supplierId: supplierId.value || undefined, category: category.value || undefined, brand: brand.value || undefined, model: model.value || undefined, availability: availability.value || undefined, priceMin: priceMin.value ? Math.round(Number(priceMin.value) * 100) : undefined, priceMax: priceMax.value ? Math.round(Number(priceMax.value) * 100) : undefined, pagina: Number(route.query.pagina ?? 1), pageSize: Number(route.query.pageSize ?? 25) });
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
}

function replaceQuery(page = 1): void {
  void router.replace({ query: { q: query.value || undefined, supplierId: supplierId.value || undefined, category: category.value || undefined, brand: brand.value || undefined, model: model.value || undefined, availability: availability.value || undefined, priceMin: priceMin.value || undefined, priceMax: priceMax.value || undefined, pagina: page === 1 ? undefined : String(page), pageSize: route.query.pageSize } });
}
function search(): void { replaceQuery(); }
function clear(): void { query.value = ""; supplierId.value = ""; category.value = ""; brand.value = ""; model.value = ""; availability.value = ""; priceMin.value = ""; priceMax.value = ""; replaceQuery(); }
const euros = (cents: number, currency: string) => new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(cents / 100);
const date = (value: string) => new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

watch(() => route.query, (next) => {
  query.value = String(next.q ?? "");
  supplierId.value = String(next.supplierId ?? "");
  category.value = String(next.category ?? "");
  brand.value = String(next.brand ?? "");
  model.value = String(next.model ?? "");
  availability.value = String(next.availability ?? "") as CatalogItemAvailability | "";
  priceMin.value = String(next.priceMin ?? "");
  priceMax.value = String(next.priceMax ?? "");
  void load();
}, { immediate: true });
onMounted(async () => { try { suppliers.value = await listSuppliers(); } catch (reason) { error.value = (reason as Error).message; } });
</script>

<template>
  <section class="supplier-catalog-view">
    <header><div><p class="eyebrow">Almacén</p><h1>Catálogo de repuestos <span class="count">{{ result.total }}</span></h1></div></header>
    <form class="filter-bar supplier-catalog-filters" @submit.prevent="search">
      <input v-model="query" aria-label="Buscar repuesto" placeholder="Nombre, SKU, proveedor, categoría o marca" />
      <select v-model="supplierId" aria-label="Proveedor"><option value="">Todos los proveedores</option><option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option></select>
      <input v-model="category" aria-label="Categoría" placeholder="Categoría" />
      <input v-model="brand" aria-label="Marca" placeholder="Marca" />
      <input v-model="model" aria-label="Modelo compatible" placeholder="Modelo compatible" />
      <select v-model="availability" aria-label="Disponibilidad"><option value="">Cualquier disponibilidad</option><option value="in_stock">Disponible</option><option value="out_of_stock">Agotado</option><option value="unknown">Sin confirmar</option></select>
      <label>Precio mín. (€)<input v-model="priceMin" aria-label="Precio mínimo en euros" type="number" min="0" step="0.01" /></label>
      <label>Precio máx. (€)<input v-model="priceMax" aria-label="Precio máximo en euros" type="number" min="0" step="0.01" /></label>
      <button type="submit">Buscar</button><button v-if="hasFilters" class="secondary" type="button" @click="clear">Limpiar</button>
    </form>
    <p v-if="error" class="feedback error" role="alert">{{ error }} <button class="secondary" type="button" @click="load">Reintentar</button></p>
    <div class="supplier-catalog-table-wrap"><table class="supplier-catalog-table">
      <thead><tr><th scope="col">Repuesto</th><th scope="col">Proveedor</th><th scope="col">Categoría</th><th scope="col">Marca / compatibilidad</th><th scope="col">Precio</th><th scope="col">Disponibilidad</th><th scope="col">Capturado</th><th scope="col">Acción</th></tr></thead>
      <tbody>
        <tr v-if="loading"><td colspan="8" class="empty">Cargando catálogo...</td></tr>
        <tr v-else-if="!result.items.length"><td colspan="8" class="empty">{{ hasFilters ? "Ningún repuesto coincide con los filtros." : "El catálogo se llenará cuando la integración envíe su primer lote." }}</td></tr>
        <tr v-for="item in result.items" v-else :key="item.id">
          <th scope="row"><RouterLink :to="{ name: 'inventory.catalog.detail', params: { id: item.id }, query: route.query }">{{ item.name }}</RouterLink><small>{{ item.sku || item.externalRef }}</small></th>
          <td>{{ supplierNames.get(item.supplierId) || "Proveedor" }}</td><td>{{ item.category || "—" }}</td>
          <td>{{ [item.brand, ...item.compatibleModels].filter(Boolean).join(" · ") || "—" }}</td><td>{{ euros(item.priceCents, item.currency) }}</td>
          <td><span :class="['status-pill', item.availability]">{{ labels[item.availability] }}</span></td><td>{{ date(item.capturedAt) }}</td>
          <td><RouterLink class="supplier-catalog-action" :to="{ name: 'inventory.catalog.detail', params: { id: item.id }, query: route.query }">Ver ficha</RouterLink></td>
        </tr>
      </tbody>
    </table></div>
    <AppPagination :page="result.page" :page-size="result.pageSize" :total="result.total" @change="replaceQuery" @page-size-change="(size) => { void router.replace({ query: { ...route.query, pageSize: String(size), pagina: undefined } }); }" />
  </section>
</template>

<style scoped>
.supplier-catalog-view { min-width: 0; }
header { margin-bottom: 20px; }
.supplier-catalog-filters { align-items: end; }
.supplier-catalog-filters label { color: #49675a; display: grid; font-size: 11px; font-weight: 700; gap: 5px; }
.supplier-catalog-filters input, .supplier-catalog-filters select { min-width: 120px; }
.supplier-catalog-table-wrap { border: 1px solid #cbd7d0; min-width: 0; overflow-x: auto; }
.supplier-catalog-table { border-collapse: collapse; min-width: 1080px; text-align: left; width: 100%; }
.supplier-catalog-table thead { background: #e2ebe5; }
.supplier-catalog-table th, .supplier-catalog-table td { border-bottom: 1px solid #d6dfda; padding: 12px 14px; vertical-align: middle; }
.supplier-catalog-table thead th { color: #60766d; font-family: "DM Mono", monospace; font-size: 10px; font-weight: 500; text-transform: uppercase; white-space: nowrap; }
.supplier-catalog-table tbody th { color: #173c36; font-size: 12px; min-width: 200px; }
.supplier-catalog-table tbody th small { color: #698078; display: block; font-size: 10px; font-weight: 400; margin-top: 4px; }
.supplier-catalog-table tbody th a { color: inherit; text-decoration: none; }
.supplier-catalog-table tbody td { color: #49675a; font-size: 11px; }
.supplier-catalog-table tbody tr:hover { background: #f7faf8; }
.supplier-catalog-action { color: #b84732; font-weight: 700; text-decoration: none; white-space: nowrap; }
@media (max-width: 720px) { .supplier-catalog-filters { align-items: stretch; flex-direction: column; }.supplier-catalog-filters > * { width: 100%; }.supplier-catalog-table { min-width: 1080px; } }
</style>
