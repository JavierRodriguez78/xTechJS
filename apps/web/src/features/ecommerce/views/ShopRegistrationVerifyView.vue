<script setup lang="ts">
import { onMounted, ref } from "vue";

const token = new URLSearchParams(window.location.search).get("token") ?? "";
const loading = ref(true);
const email = ref("");
const error = ref("");

onMounted(async () => {
  if (!token) { error.value = "Falta el enlace de verificación."; loading.value = false; return; }
  try {
    const response = await fetch(`/api/shop/register/verify/${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error("El enlace de verificación no es válido o ha caducado.");
    const result = await response.json() as { email: string };
    email.value = result.email;
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="login-page customer-login-page">
    <section class="login-panel shop-register-panel" aria-labelledby="shop-verify-title">
      <RouterLink class="brand login-brand" :to="{ name: 'shop.catalog' }">xTech<span>JS</span></RouterLink>
      <p class="eyebrow">Verificación de correo</p>
      <h1 id="shop-verify-title">{{ loading ? "Validando enlace" : error ? "Enlace no válido" : "Correo verificado" }}</h1>
      <p v-if="loading" class="feedback info" role="status">Estamos comprobando tu enlace...</p>
      <p v-else-if="error" class="feedback error" role="alert">{{ error }}</p>
      <template v-else>
        <p class="feedback success">Hemos verificado {{ email }}. Continúa para completar tu cuenta.</p>
        <RouterLink class="button-link shop-register-login" :to="{ name: 'shop.register.complete', query: { token } }">Continuar con el registro</RouterLink>
      </template>
    </section>
  </main>
</template>
