<script setup lang="ts">
import { ref } from "vue";

const email = ref("");
const loading = ref(false);
const error = ref("");
const requested = ref(false);

async function submit(): Promise<void> {
  error.value = "";
  loading.value = true;
  try {
    const response = await fetch("/api/shop/register/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.value })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(payload.message ?? "No se pudo solicitar el enlace de verificación.");
    }
    requested.value = true;
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-page customer-login-page">
    <section class="login-panel shop-register-panel" aria-labelledby="shop-register-title">
      <RouterLink class="brand login-brand" :to="{ name: 'shop.catalog' }">xTech<span>JS</span></RouterLink>
      <p class="eyebrow">Tienda xTechJS</p>
      <h1 id="shop-register-title">{{ requested ? "Revisa tu correo" : "Crear cuenta" }}</h1>
      <template v-if="requested">
        <p class="feedback success" role="status">Si el correo puede registrarse, recibirás un enlace para verificarlo y continuar con el alta.</p>
        <RouterLink class="button-link shop-register-login" :to="{ name: 'shop.catalog' }">Volver a la tienda</RouterLink>
      </template>
      <form v-else @submit.prevent="submit">
        <label><span>Correo electrónico</span><input v-model="email" type="email" autocomplete="email" required maxlength="320" /></label>
        <p v-if="error" class="feedback error">{{ error }}</p>
        <button type="submit" :disabled="loading">{{ loading ? "Solicitando enlace" : "Enviar enlace de verificación" }}</button>
      </form>
      <p v-if="!requested" class="customer-login-register">¿Ya tienes cuenta? <RouterLink :to="{ name: 'customer.login' }">Acceder</RouterLink></p>
    </section>
  </main>
</template>
