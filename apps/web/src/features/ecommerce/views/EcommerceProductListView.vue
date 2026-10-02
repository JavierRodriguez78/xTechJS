<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppPagination from "../../../shared/components/AppPagination.vue";
import { listManagedShopProducts, type EcommerceCategory, type ShopProductPage } from "../api";

const route = useRoute();
const router = useRouter();
const result = ref<ShopProductPage>({ items: [], total: 0, page: 1, pageSize: 25 });
const loading = ref(true);
const error = ref("");
const query = ref("");
const category = ref<EcommerceCategory | "">("");
const published = ref<"" | "true" | "false">("");
const categories: { value: EcommerceCategory; label: string }[] = [{ value: "console", label: "Consolas" }, { value: "retro_console", label: "Consolas retro" }, { value: "game", label: "Juegos" }, { value: "phone", label: "Móviles" }, { value: "tablet", label: "Tablets" }, { value: "accessory", label: "Accesorios" }, { value: "other", label: "Otros" }];
const hasFilters = computed(() => Boolean(query.value || category.value || published.value));
const money = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);

async function load(): Promise<void> { loading.value = true; error.value = ""; try { result.value = await listManagedShopProducts({ q: query.value || undefined, category: category.value || undefined, published: published.value === "" ? undefined : published.value === "true", pagina: Number(route.query.pagina ?? 1), pageSize: 25 }); } catch (reason) { error.value = (reason as Error).message; } finally { loading.value = false; } }
function replaceQuery(page = 1): void { void router.replace({ query: { q: query.value || undefined, category: category.value || undefined, published: published.value || undefined, pagina: page === 1 ? undefined : String(page) } }); }
function clear(): void { query.value = ""; category.value = ""; published.value = ""; }
let debounce: number | undefined;
function syncFilters(): void { window.clearTimeout(debounce); debounce = window.setTimeout(() => replaceQuery(), 300); }
watch(() => route.query, (next) => { query.value = String(next.q ?? ""); category.value = String(next.category ?? "") as EcommerceCategory | ""; published.value = String(next.published ?? "") as "" | "true" | "false"; void load(); }, { immediate: true });
watch([query, category, published], syncFilters);
</script>

<template>
  <section class="ecommerce-products-view"><header><div><p class="eyebrow">Ecommerce</p><h1>Catálogo <span class="count">{{ result.total }}</span></h1></div><RouterLink class="button-link" :to="{ name: 'ecommerce.products.create' }">Nuevo producto</RouterLink></header><div class="filter-bar"><input v-model="query" type="search" placeholder="Buscar título o SKU" /><select v-model="category"><option value="">Todas las categorías</option><option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option></select><select v-model="published"><option value="">Publicados y borradores</option><option value="true">Publicados</option><option value="false">Borradores</option></select><button v-if="hasFilters" class="secondary" type="button" @click="clear">Limpiar</button></div><p v-if="error" class="feedback error">{{ error }} <button class="secondary" type="button" @click="load">Reintentar</button></p><div v-else class="customer-list"><template v-if="loading"><div v-for="item in 6" :key="item" class="skeleton-row" /></template><template v-else><RouterLink v-for="product in result.items" :key="product.id" class="ecommerce-product-row" :to="{ name: 'ecommerce.products.edit', params: { id: product.id } }"><div><strong>{{ product.title }}</strong><span>{{ product.sku }} · {{ product.stockQuantity }} unidades</span></div><span>{{ money(product.priceCents) }}</span><span :class="['status-pill', product.published ? 'delivered' : 'pending_payment']">{{ product.published ? "Publicado" : "Borrador" }}</span></RouterLink></template><p v-if="!loading && !result.total" class="empty">No hay productos con estos filtros.</p></div><AppPagination :page="result.page" :page-size="result.pageSize" :total="result.total" @change="replaceQuery" />
  </section>
</template>
