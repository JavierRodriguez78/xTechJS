<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppPagination from "../../../../shared/components/AppPagination.vue";
import { listSupplierCatalog, type SupplierCatalogPage } from "../../api";

const route = useRoute();
const router = useRouter();
const result = ref<SupplierCatalogPage>({ items: [], total: 0, page: 1, pageSize: 25 });
const error = ref("");
const loading = ref(true);
const currency = (cents: number, code: string) => new Intl.NumberFormat("es-ES", { style: "currency", currency: code }).format(cents / 100);

function queryNumber(value: unknown, fallback: number, allowed?: readonly number[]): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && (!allowed || allowed.includes(parsed)) ? parsed : fallback;
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    result.value = await listSupplierCatalog({
      supplierId: String(route.params.id),
      pagina: queryNumber(route.query.pagina, 1),
      pageSize: queryNumber(route.query.pageSize, 25, [25, 50, 100])
    });
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
}

function changePage(page: number): void {
  void router.replace({ query: { ...route.query, pagina: page === 1 ? undefined : String(page) } });
}

function changePageSize(pageSize: number): void {
  void router.replace({ query: { ...route.query, pageSize: String(pageSize), pagina: undefined } });
}

watch(() => [route.params.id, route.query.pagina, route.query.pageSize], () => { void load(); }, { immediate: true });
</script>

<template>
  <section class="detail-tab">
    <h2>Catalogo de repuestos</h2>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="empty">Cargando catalogo...</p>
    <p v-else-if="!result.items.length" class="empty">No hay repuestos vinculados a este proveedor.</p>
    <div v-else class="history-table-wrap">
      <table class="history-table">
        <thead><tr><th scope="col">Repuesto</th><th scope="col">Referencia</th><th scope="col">Categoria</th><th scope="col">Precio</th><th scope="col">Inventario</th></tr></thead>
        <tbody>
          <tr v-for="item in result.items" :key="item.id">
            <th scope="row"><RouterLink :to="{ name: 'inventory.catalog.detail', params: { id: item.id } }">{{ item.name }}</RouterLink></th>
            <td>{{ item.sku || item.externalRef }}</td><td>{{ item.category || "-" }}</td><td>{{ currency(item.priceCents, item.currency) }}</td><td>{{ item.inventoryItemId ? "Vinculado" : "Sin vincular" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <AppPagination v-if="!loading && !error" :page="result.page" :page-size="result.pageSize" :total="result.total" @change="changePage" @page-size-change="changePageSize" />
  </section>
</template>

<style scoped>
.history-table-wrap { border: 1px solid #cbd7d0; overflow-x: auto; }
.history-table { border-collapse: collapse; min-width: 640px; text-align: left; width: 100%; }
.history-table th, .history-table td { border-bottom: 1px solid #d6dfda; padding: 12px 14px; }
.history-table thead th { color: #60766d; font-family: "DM Mono", monospace; font-size: 10px; font-weight: 500; text-transform: uppercase; }
.history-table tbody th a { color: #173c36; }
</style>
