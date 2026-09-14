<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { signInCustomer } from "./session";

const route = useRoute();
const router = useRouter();
const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");

async function submit(): Promise<void> {
  loading.value = true;
  errorMessage.value = "";
  try {
    await signInCustomer(email.value, password.value);
    const redirect = typeof route.query.redirect === "string" && route.query.redirect.startsWith("/customer")
      ? route.query.redirect
      : "/customer";
    await router.replace(redirect);
  }
  catch (error) { errorMessage.value = (error as Error).message; }
  finally { loading.value = false; }
}
</script>

<template>
  <main class="login-page customer-login-page">
    <section class="login-panel" aria-labelledby="customer-login-title">
      <a class="brand login-brand" href="/customer">xTech<span>JS</span></a>
      <p class="eyebrow">Portal de cliente</p>
      <h1 id="customer-login-title">Consulta tu reparacion.</h1>
      <form @submit.prevent="submit">
        <label><span>Email</span><input v-model="email" type="email" autocomplete="email" required /></label>
        <label><span>Contrasena</span><input v-model="password" type="password" autocomplete="current-password" required /></label>
        <p v-if="errorMessage" class="feedback error">{{ errorMessage }}</p>
        <button type="submit" :disabled="loading">{{ loading ? "Accediendo" : "Entrar" }}</button>
      </form>
    </section>
  </main>
</template>
