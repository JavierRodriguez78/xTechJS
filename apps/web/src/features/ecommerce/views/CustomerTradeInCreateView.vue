<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { customerSession } from "../../customer-portal/session";
import { createCustomerTradeInRequest, type CreateTradeInRequestInput } from "../api";

const router = useRouter();
const form = ref<CreateTradeInRequestInput>({ deviceType: "console", brand: "", model: "", conditionDescription: "" });
const saving = ref(false);
const error = ref("");
async function submit(): Promise<void> { if (!customerSession.value) return; saving.value = true; error.value = ""; try { const request = await createCustomerTradeInRequest(customerSession.value.accessToken, form.value); await router.push({ name: "customer.trade-in.detail", params: { id: request.id } }); } catch (reason) { error.value = (reason as Error).message; } finally { saving.value = false; } }
</script>

<template>
  <section class="customer-view"><p class="shop-back"><RouterLink :to="{ name: 'customer.trade-in.list' }">Volver a mis solicitudes</RouterLink></p><form class="entity-form ecommerce-product-form" @submit.prevent="submit"><header><div><p class="eyebrow">Compraventa</p><h1>Solicitar valoración</h1><p>Crearás un borrador para poder añadir fotos y documentación antes de enviarlo.</p></div></header><fieldset><legend>Equipo</legend><label>Tipo de equipo<select v-model="form.deviceType"><option value="console">Consola</option><option value="retro_console">Consola retro</option><option value="game">Juego</option><option value="phone">Móvil</option><option value="tablet">Tablet</option><option value="other">Otro</option></select></label><div class="ecommerce-form-row"><label>Marca<input v-model="form.brand" required maxlength="100" /></label><label>Modelo<input v-model="form.model" required maxlength="160" /></label></div><label>Estado y observaciones<textarea v-model="form.conditionDescription" required maxlength="10000" rows="7" placeholder="Describe el estado, funcionamiento, accesorios y defectos visibles." /></label></fieldset><p v-if="error" class="feedback error">{{ error }}</p><footer><RouterLink class="secondary button-link" :to="{ name: 'customer.trade-in.list' }">Cancelar</RouterLink><button :disabled="saving">{{ saving ? "Creando" : "Continuar con fotos" }}</button></footer></form></section>
</template>
