<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { createManagedShopProduct, type ManagedShopProductInput } from "../api";

const router = useRouter();
const form = ref<ManagedShopProductInput>({ sku: "", title: "", description: "", category: "console", condition: "refurbished", priceCents: 0, stockQuantity: 1, published: false });
const saving = ref(false);
const error = ref("");
async function save(): Promise<void> { saving.value = true; error.value = ""; try { const product = await createManagedShopProduct(form.value); await router.push({ name: "ecommerce.products.edit", params: { id: product.id } }); } catch (reason) { error.value = (reason as Error).message; } finally { saving.value = false; } }
</script>

<template>
  <form class="entity-form ecommerce-product-form" @submit.prevent="save"><header><div><p class="eyebrow">Ecommerce</p><h1>Nuevo producto</h1></div></header><fieldset><legend>Producto</legend><label>SKU<input v-model="form.sku" required maxlength="120" /></label><label>Título<input v-model="form.title" required maxlength="240" /></label><label>Descripción<textarea v-model="form.description" required maxlength="10000" rows="6" /></label><div class="ecommerce-form-row"><label>Categoría<select v-model="form.category"><option value="console">Consola</option><option value="retro_console">Consola retro</option><option value="game">Juego</option><option value="phone">Móvil</option><option value="tablet">Tablet</option><option value="accessory">Accesorio</option><option value="other">Otro</option></select></label><label>Estado<select v-model="form.condition"><option value="new">Nuevo</option><option value="refurbished">Reacondicionado</option><option value="used_good">Usado, buen estado</option><option value="used_fair">Usado</option></select></label></div></fieldset><fieldset><legend>Venta</legend><div class="ecommerce-form-row"><label>Precio (céntimos)<input v-model.number="form.priceCents" type="number" min="0" required /></label><label>Stock<input v-model.number="form.stockQuantity" type="number" min="0" required /></label></div><label class="checkbox-row"><input v-model="form.published" type="checkbox" /><span>Publicar en la tienda</span></label></fieldset><p v-if="error" class="feedback error">{{ error }}</p><footer><RouterLink class="secondary button-link" :to="{ name: 'ecommerce.products.list' }">Cancelar</RouterLink><button :disabled="saving">{{ saving ? "Guardando" : "Crear producto" }}</button></footer></form>
</template>
