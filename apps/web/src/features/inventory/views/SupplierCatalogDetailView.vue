<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { listAccessibleStores, type Store } from "../../admin/api";
import { staffSession } from "../../auth/session";
import { createInventoryItemFromSupplierCatalog, createPurchaseOrderFromSupplierCatalog, getSupplierCatalogItem, linkSupplierCatalogItem, listItems, listSuppliers, type Item, type Supplier, type SupplierCatalogItem } from "../api";

const route = useRoute();
const router = useRouter();
const item = ref<SupplierCatalogItem | null>(null);
const supplier = ref<Supplier | null>(null);
const stores = ref<Array<Pick<Store, "id" | "name" | "active">>>([]);
const inventoryItems = ref<Item[]>([]);
const storeId = ref(String(route.query.storeId ?? staffSession.value?.user.defaultStoreId ?? staffSession.value?.user.storeId ?? ""));
const inventoryItemId = ref("");
const sku = ref("");
const quantity = ref(1);
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const success = ref("");
const money = (cents: number, currency: string) => new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(cents / 100);
const capturedAt = computed(() => item.value ? new Date(item.value.capturedAt).toLocaleString("es-ES") : "");

async function loadItems(): Promise<void> {
  if (!storeId.value) { inventoryItems.value = []; return; }
  try { inventoryItems.value = await listItems(storeId.value); }
  catch (reason) { error.value = (reason as Error).message; }
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const [catalogItem, supplierList, storeList] = await Promise.all([getSupplierCatalogItem(String(route.params.id)), listSuppliers(), listAccessibleStores()]);
    item.value = catalogItem;
    supplier.value = supplierList.find((entry) => entry.id === catalogItem.supplierId) ?? null;
    stores.value = storeList.filter((store) => store.active);
    if (!storeId.value && stores.value.length === 1) storeId.value = stores.value[0].id;
    if (catalogItem.inventoryItemId) inventoryItemId.value = catalogItem.inventoryItemId;
    await loadItems();
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
}

async function changeStore(): Promise<void> { await router.replace({ query: storeId.value ? { storeId: storeId.value } : {} }); await loadItems(); }
async function linkItem(): Promise<void> {
  if (!item.value || !inventoryItemId.value) return;
  busy.value = true; error.value = ""; success.value = "";
  try { item.value = await linkSupplierCatalogItem(item.value.id, inventoryItemId.value); success.value = "Repuesto vinculado al artículo de inventario."; }
  catch (reason) { error.value = (reason as Error).message; }
  finally { busy.value = false; }
}
async function createItem(): Promise<void> {
  if (!item.value) return;
  busy.value = true; error.value = ""; success.value = "";
  try {
    const result = await createInventoryItemFromSupplierCatalog(item.value.id, sku.value || undefined);
    item.value = result.catalogItem;
    if (storeId.value) inventoryItems.value = await listItems(storeId.value);
    inventoryItemId.value = result.inventoryItem.id;
    success.value = "Artículo de inventario creado con stock inicial cero.";
  } catch (reason) { error.value = (reason as Error).message; }
  finally { busy.value = false; }
}
async function createOrder(): Promise<void> {
  if (!item.value || !storeId.value) return;
  busy.value = true; error.value = ""; success.value = "";
  try {
    await createPurchaseOrderFromSupplierCatalog(item.value.id, { storeId: storeId.value, quantity: quantity.value });
    success.value = "Pedido de compra creado con el precio observado como coste orientativo.";
  } catch (reason) { error.value = (reason as Error).message; }
  finally { busy.value = false; }
}

watch(() => route.params.id, () => { void load(); });
onMounted(load);
</script>

<template>
  <section class="supplier-catalog-detail">
    <p class="supplier-catalog-breadcrumb"><RouterLink :to="{ name: 'inventory.catalog.list', query: route.query }">Catálogo de repuestos</RouterLink><span aria-hidden="true">/</span><span>Ficha</span></p>
    <p v-if="loading" class="empty" aria-live="polite">Cargando repuesto...</p>
    <p v-else-if="error && !item" class="feedback error" role="alert">{{ error }}</p>
    <template v-else-if="item">
      <header><div><p class="eyebrow">{{ item.category || "Repuesto" }} · {{ supplier?.name || "Proveedor" }}</p><h1>{{ item.name }}</h1></div><span :class="['status-pill', item.availability]">{{ item.availability === "in_stock" ? "Disponible" : item.availability === "out_of_stock" ? "Agotado" : "Sin confirmar" }}</span></header>
      <div class="supplier-catalog-detail-grid">
        <section class="supplier-catalog-facts"><dl><dt>Precio observado</dt><dd class="supplier-catalog-price">{{ money(item.priceCents, item.currency) }}</dd><dt>Proveedor</dt><dd>{{ supplier?.name || "—" }}</dd><dt>SKU proveedor</dt><dd>{{ item.sku || "—" }}</dd><dt>Referencia externa</dt><dd>{{ item.externalRef }}</dd><dt>Marca compatible</dt><dd>{{ item.brand || "—" }}</dd><dt>Modelos compatibles</dt><dd>{{ item.compatibleModels.join(", ") || "—" }}</dd><dt>Última captura</dt><dd>{{ capturedAt }}</dd><dt>Artículo vinculado</dt><dd><RouterLink v-if="item.inventoryItemId" :to="{ name: 'inventory.detail.general', params: { id: item.inventoryItemId }, query: storeId ? { storeId } : {} }">Ver artículo de inventario</RouterLink><span v-else>Sin vincular</span></dd></dl><a class="supplier-original-link" :href="item.url" target="_blank" rel="noopener noreferrer">Abrir ficha del proveedor</a></section>
        <div class="supplier-catalog-actions">
          <section class="supplier-action-section"><p class="eyebrow">Vincular existente</p><h2>Artículo de inventario</h2><label v-if="stores.length > 1">Tienda<select v-model="storeId" @change="changeStore"><option value="">Selecciona tienda</option><option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option></select></label><select v-model="inventoryItemId" aria-label="Artículo de inventario"><option value="">Selecciona por SKU o nombre</option><option v-for="entry in inventoryItems" :key="entry.id" :value="entry.id">{{ entry.sku }} · {{ entry.name }}</option></select><button class="secondary" type="button" :disabled="busy || !inventoryItemId" @click="linkItem">Vincular artículo</button>
          </section>
          <section class="supplier-action-section"><p class="eyebrow">Crear artículo propio</p><h2>Gestionar como stock</h2><label>SKU interno <small>Opcional</small><input v-model="sku" maxlength="80" placeholder="Se genera si queda vacío" /></label><button type="button" :disabled="busy || Boolean(item.inventoryItemId)" @click="createItem">{{ item.inventoryItemId ? "Artículo ya vinculado" : "Crear artículo" }}</button><p class="supplier-action-note">La conversión es explícita y crea stock inicial cero solo en las tiendas permitidas.</p></section>
          <section class="supplier-action-section"><p class="eyebrow">Compras</p><h2>Nuevo pedido</h2><label>Tienda<select v-model="storeId" required @change="changeStore"><option value="">Selecciona tienda</option><option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option></select></label><label>Cantidad<input v-model.number="quantity" type="number" min="1" max="1000000" required /></label><p v-if="!item.inventoryItemId" class="supplier-action-note">Vincula o crea primero el artículo de inventario.</p><button class="secondary" type="button" :disabled="busy || !storeId || !item.inventoryItemId" @click="createOrder">Crear pedido de compra</button></section>
        </div>
      </div>
      <p v-if="success" class="feedback success" role="status">{{ success }}</p><p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    </template>
  </section>
</template>

<style scoped>
.supplier-catalog-detail { max-width: 1120px; min-width: 0; }
.supplier-catalog-breadcrumb { align-items: center; color: #698078; display: flex; font-size: 12px; gap: 9px; margin: 0 0 20px; }
.supplier-catalog-breadcrumb a { color: #b84732; font-weight: 700; text-decoration: none; }
header { align-items: center; border-bottom: 1px solid #cbd7d0; margin-bottom: 24px; padding-bottom: 18px; }
header h1 { font-size: 30px; }
.supplier-catalog-detail-grid { display: grid; gap: 36px; grid-template-columns: minmax(0, 1fr) minmax(300px, .85fr); }
.supplier-catalog-facts dl { display: grid; gap: 12px 18px; grid-template-columns: 160px minmax(0, 1fr); margin: 0; }
.supplier-catalog-facts dt { color: #698078; font-size: 11px; font-weight: 700; }
.supplier-catalog-facts dd { color: #263d36; font-size: 13px; margin: 0; overflow-wrap: anywhere; }
.supplier-catalog-facts .supplier-catalog-price { color: #b84732; font-family: "DM Mono", monospace; font-size: 21px; font-weight: 700; }
.supplier-original-link { color: #b84732; display: inline-block; font-size: 12px; font-weight: 700; margin-top: 20px; }
.supplier-catalog-actions { border-top: 1px solid #cbd7d0; }
.supplier-action-section { border-bottom: 1px solid #cbd7d0; display: grid; gap: 10px; padding: 18px 0; }
.supplier-action-section h2 { font-size: 16px; }
.supplier-action-section label { color: #49675a; display: grid; font-size: 11px; font-weight: 700; gap: 5px; }
.supplier-action-section input, .supplier-action-section select { background: #fff; border: 1px solid #b5c9bd; border-radius: 4px; font: inherit; min-width: 0; padding: 9px; }
.supplier-action-section button { justify-self: start; }
.supplier-action-note { color: #698078; font-size: 11px; line-height: 1.5; margin: 0; }
@media (max-width: 850px) { .supplier-catalog-detail-grid { grid-template-columns: minmax(0, 1fr); }.supplier-catalog-facts dl { grid-template-columns: 140px minmax(0,1fr); } }
@media (max-width: 520px) { .supplier-catalog-facts dl { grid-template-columns: minmax(0,1fr); gap: 4px; }.supplier-catalog-facts dd { margin-bottom: 10px; } }
</style>
