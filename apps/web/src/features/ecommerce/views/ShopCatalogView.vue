<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppPagination from "../../../shared/components/AppPagination.vue";
import { listShopProducts, type EcommerceCategory, type EcommerceCondition, type ShopProductPage } from "../api";

const route = useRoute();
const router = useRouter();
const result = ref<ShopProductPage>({ items: [], total: 0, page: 1, pageSize: 25 });
const loading = ref(true);
const error = ref("");
const query = ref("");
const category = ref<EcommerceCategory | "">("");
const condition = ref<EcommerceCondition | "">("");
const maxPrice = ref("");
let debounce: number | undefined;

const categories: { value: EcommerceCategory; label: string }[] = [
  { value: "console", label: "Consolas" }, { value: "retro_console", label: "Consolas retro" }, { value: "game", label: "Juegos" }, { value: "phone", label: "Móviles" }, { value: "tablet", label: "Tablets" }, { value: "accessory", label: "Accesorios" }, { value: "other", label: "Otros" }
];
const conditionLabels: Record<EcommerceCondition, string> = { new: "Nuevo", refurbished: "Reacondicionado", used_good: "Usado, buen estado", used_fair: "Usado" };
const hasFilters = computed(() => Boolean(query.value || category.value || condition.value || maxPrice.value));
const money = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    result.value = await listShopProducts({ q: query.value || undefined, category: category.value || undefined, condition: condition.value || undefined, maxPriceCents: maxPrice.value ? Math.round(Number(maxPrice.value) * 100) : undefined, pagina: Number(route.query.pagina ?? 1), pageSize: 25 });
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
}

function replaceQuery(page = 1): void {
  void router.replace({ query: { q: query.value || undefined, category: category.value || undefined, condition: condition.value || undefined, maxPrice: maxPrice.value || undefined, pagina: page === 1 ? undefined : String(page) } });
}

function syncFilters(): void {
  window.clearTimeout(debounce);
  debounce = window.setTimeout(() => replaceQuery(), 300);
}

function clear(): void {
  query.value = "";
  category.value = "";
  condition.value = "";
  maxPrice.value = "";
}

watch(() => route.query, (next) => {
  query.value = String(next.q ?? "");
  category.value = String(next.category ?? "") as EcommerceCategory | "";
  condition.value = String(next.condition ?? "") as EcommerceCondition | "";
  maxPrice.value = String(next.maxPrice ?? "");
  void load();
}, { immediate: true });
watch([query, category, condition, maxPrice], syncFilters);
</script>

<template>
  <main class="shop-page">
    <header class="shop-header">
      <RouterLink class="shop-brand" :to="{ name: 'shop.catalog' }">xTech<span>JS</span> tienda</RouterLink>
      <div class="shop-actions"><RouterLink :to="{ name: 'customer.login', query: { redirect: '/customer/vender-equipo' } }">Vende tu equipo</RouterLink><RouterLink :to="{ name: 'shop.register' }">Crear cuenta</RouterLink><RouterLink class="shop-sign-in" :to="{ name: 'customer.login' }">Acceder</RouterLink></div>
    </header>
    <section class="shop-intro">
      <p class="eyebrow">Selección técnica</p>
      <h1>Equipos listos para su próxima partida.</h1>
      <p>Consolas, juegos y dispositivos revisados para volver a usarse.</p>
    </section>
    <section class="shop-catalog" aria-label="Catálogo de productos">
      <div class="shop-filter-bar">
        <input v-model="query" type="search" placeholder="Buscar producto o referencia" aria-label="Buscar productos" />
        <select v-model="category" aria-label="Categoría"><option value="">Todas las categorías</option><option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option></select>
        <select v-model="condition" aria-label="Estado"><option value="">Cualquier estado</option><option v-for="(label, value) in conditionLabels" :key="value" :value="value">{{ label }}</option></select>
        <label>Hasta <input v-model="maxPrice" type="number" min="0" step="1" inputmode="numeric" placeholder="EUR" /></label>
        <button v-if="hasFilters" class="secondary" type="button" @click="clear">Limpiar</button>
      </div>
      <p v-if="error" class="feedback error">{{ error }} <button class="secondary" type="button" @click="load">Reintentar</button></p>
      <div v-else class="shop-product-grid">
        <div v-if="loading" v-for="item in 8" :key="item" class="shop-product-skeleton" />
        <p v-else-if="!result.total" class="empty">No hay productos que coincidan con estos filtros.</p>
        <RouterLink v-else v-for="product in result.items" :key="product.id" class="shop-product-card" :to="{ name: 'shop.product', params: { id: product.id } }">
          <div class="shop-product-visual" :class="product.category"><span>{{ categories.find((item) => item.value === product.category)?.label ?? "Equipo" }}</span></div>
          <div class="shop-product-content"><p class="eyebrow">{{ conditionLabels[product.condition] }}</p><h2>{{ product.title }}</h2><p>{{ product.description }}</p><strong>{{ money(product.priceCents) }}</strong></div>
        </RouterLink>
      </div>
      <AppPagination :page="result.page" :page-size="result.pageSize" :total="result.total" @change="replaceQuery" />
    </section>
  </main>
</template>
