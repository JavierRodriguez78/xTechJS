<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getShopProduct, getShopProductAttachments, shopProductAttachmentUrl, type ShopAttachment, type ShopProduct } from "../api";
import { addToCart, cartItemCount } from "../cart";

const route = useRoute();
const product = ref<ShopProduct | null>(null);
const attachments = ref<ShopAttachment[]>([]);
const loading = ref(true);
const error = ref("");
const selectedImage = ref("");
const images = computed(() => attachments.value.filter((attachment) => attachment.mimeType.startsWith("image/")));
const conditionLabels = { new: "Nuevo", refurbished: "Reacondicionado", used_good: "Usado, buen estado", used_fair: "Usado" } as const;
const categoryLabels = { console: "Consola", retro_console: "Consola retro", game: "Juego", phone: "Móvil", tablet: "Tablet", accessory: "Accesorio", other: "Equipo" } as const;
const money = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
const attachmentUrl = (attachmentId: string) => shopProductAttachmentUrl(String(route.params.id), attachmentId);

onMounted(async () => {
  try {
    const id = String(route.params.id);
    const [loadedProduct, loadedAttachments] = await Promise.all([getShopProduct(id), getShopProductAttachments(id)]);
    product.value = loadedProduct;
    attachments.value = loadedAttachments;
    selectedImage.value = images.value[0]?.id ?? "";
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="shop-page">
    <header class="shop-header"><RouterLink class="shop-brand" :to="{ name: 'shop.catalog' }">xTech<span>JS</span> tienda</RouterLink><div class="shop-actions"><RouterLink :to="{ name: 'shop.catalog' }">Catálogo</RouterLink><RouterLink :to="{ name: 'shop.cart' }">Carrito <span v-if="cartItemCount">({{ cartItemCount }})</span></RouterLink><RouterLink class="shop-sign-in" :to="{ name: 'customer.login' }">Acceder</RouterLink></div></header>
    <p class="shop-back"><RouterLink :to="{ name: 'shop.catalog' }">Volver al catálogo</RouterLink></p>
    <p v-if="loading" class="empty">Cargando producto...</p>
    <p v-else-if="error" class="feedback error">{{ error }}</p>
    <section v-else-if="product" class="shop-product-detail">
      <div class="shop-gallery">
        <div v-if="selectedImage" class="shop-gallery-main"><img :src="attachmentUrl(selectedImage)" :alt="product.title" /></div>
        <div v-else class="shop-gallery-placeholder" :class="product.category">{{ categoryLabels[product.category] }}</div>
        <div v-if="images.length > 1" class="shop-gallery-thumbnails"><button v-for="image in images" :key="image.id" type="button" :class="{ active: selectedImage === image.id }" @click="selectedImage = image.id"><img :src="attachmentUrl(image.id)" :alt="image.fileName" /></button></div>
      </div>
      <article class="shop-product-summary"><p class="eyebrow">{{ categoryLabels[product.category] }} · {{ conditionLabels[product.condition] }}</p><h1>{{ product.title }}</h1><strong>{{ money(product.priceCents) }}</strong><p class="shop-product-description">{{ product.description }}</p><dl><dt>Referencia</dt><dd>{{ product.sku }}</dd><dt>Disponibilidad</dt><dd>{{ product.stockQuantity }} {{ product.stockQuantity === 1 ? "unidad" : "unidades" }}</dd></dl><button type="button" @click="addToCart(product)">Añadir al carrito</button></article>
    </section>
  </main>
</template>
