<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const form = ref({ displayName: "", email: "", phone: "", password: "", passwordConfirm: "", consentAccepted: false });
const loading = ref(false);
const error = ref("");
const registered = ref(false);
const passwordMismatch = computed(() => Boolean(form.value.passwordConfirm) && form.value.password !== form.value.passwordConfirm);
const consentText = "Autorizo el tratamiento de mis datos para la gestion de la reparacion, facturacion y comunicacion del estado del servicio.";

async function submit(): Promise<void> {
  error.value = "";
  if (form.value.password.length < 12) { error.value = "La contraseña debe tener al menos 12 caracteres."; return; }
  if (passwordMismatch.value) { error.value = "Las contraseñas no coinciden."; return; }
  if (!form.value.consentAccepted) { error.value = "Debes aceptar la autorización de tratamiento de datos."; return; }

  loading.value = true;
  try {
    const response = await fetch("/api/shop/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: form.value.displayName, email: form.value.email, phone: form.value.phone || undefined, password: form.value.password, consentAccepted: true, consentText })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(response.status === 409 ? "Ya existe una cuenta con ese correo electrónico." : payload.message ?? "No se pudo completar el registro.");
    }
    registered.value = true;
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
      <h1 id="shop-register-title">{{ registered ? "Cuenta creada" : "Crear cuenta" }}</h1>
      <template v-if="registered">
        <p class="feedback success">Tu cuenta está lista. Ya puedes acceder al portal y finalizar tus compras.</p>
        <RouterLink class="button-link shop-register-login" :to="{ name: 'customer.login' }">Acceder a mi cuenta</RouterLink>
      </template>
      <form v-else @submit.prevent="submit">
        <label><span>Nombre o razón social</span><input v-model="form.displayName" autocomplete="name" required maxlength="160" /></label>
        <label><span>Correo electrónico</span><input v-model="form.email" type="email" autocomplete="email" required maxlength="320" /></label>
        <label><span>Teléfono <small>Opcional</small></span><input v-model="form.phone" type="tel" autocomplete="tel" maxlength="64" /></label>
        <label><span>Contraseña</span><input v-model="form.password" type="password" autocomplete="new-password" required minlength="12" maxlength="256" /></label>
        <label><span>Confirmar contraseña</span><input v-model="form.passwordConfirm" type="password" autocomplete="new-password" required minlength="12" maxlength="256" /></label>
        <label class="checkbox-row"><input v-model="form.consentAccepted" type="checkbox" required /><span>{{ consentText }}</span></label>
        <p v-if="passwordMismatch" class="feedback error">Las contraseñas no coinciden.</p>
        <p v-if="error" class="feedback error">{{ error }}</p>
        <button type="submit" :disabled="loading || passwordMismatch">{{ loading ? "Creando cuenta" : "Crear cuenta" }}</button>
      </form>
      <p v-if="!registered" class="customer-login-register">¿Ya tienes cuenta? <RouterLink :to="{ name: 'customer.login' }">Acceder</RouterLink></p>
    </section>
  </main>
</template>
