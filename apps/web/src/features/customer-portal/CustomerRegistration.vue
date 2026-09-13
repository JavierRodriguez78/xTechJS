<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

const params = new URLSearchParams(window.location.search);
const token = params.get("token") ?? "";

const loading = ref(false);
const checkingToken = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const form = ref({
  password: "",
  passwordConfirm: "",
  billingName: "",
  billingTaxId: "",
  billingAddress: "",
  billingPostalCode: "",
  billingCity: "",
  billingProvince: "",
  consentAccepted: false
});
const customerEmail = ref("");

const passwordMismatch = computed(() => form.value.password !== "" && form.value.passwordConfirm !== "" && form.value.password !== form.value.passwordConfirm);

async function validateToken(): Promise<void> {
  if (!token) {
    errorMessage.value = "Falta el token de registro.";
    checkingToken.value = false;
    return;
  }

  try {
    const response = await fetch(`/api/customers/register/${encodeURIComponent(token)}`);
    if (!response.ok) {
      throw new Error("El enlace de registro no es valido o ha caducado.");
    }
    const payload = await response.json() as { email: string };
    customerEmail.value = payload.email ?? "";
    errorMessage.value = "";
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    checkingToken.value = false;
  }
}

async function submit(): Promise<void> {
  if (!token) {
    errorMessage.value = "Falta el token de registro.";
    return;
  }
  if (form.value.password.length < 12) {
    errorMessage.value = "La contraseña debe tener al menos 12 caracteres.";
    return;
  }
  if (passwordMismatch.value) {
    errorMessage.value = "Las contraseñas no coinciden.";
    return;
  }
  if (!form.value.consentAccepted) {
    errorMessage.value = "Debes aceptar la autorizacion de tratamiento de datos.";
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await fetch(`/api/customers/register/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        password: form.value.password,
        billingName: form.value.billingName,
        billingTaxId: form.value.billingTaxId,
        billingAddress: form.value.billingAddress,
        billingPostalCode: form.value.billingPostalCode,
        billingCity: form.value.billingCity,
        billingProvince: form.value.billingProvince,
        consentAccepted: true,
        consentText: "Autorizo el tratamiento de mis datos para la gestion de la reparacion, facturacion y comunicacion del estado del servicio."
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: "No se pudo completar el registro." }));
      throw new Error(payload.message ?? "No se pudo completar el registro.");
    }

    successMessage.value = "Registro completado correctamente. Ya puedes iniciar sesion en el portal del cliente.";
    form.value = { password: "", passwordConfirm: "", billingName: "", billingTaxId: "", billingAddress: "", billingPostalCode: "", billingCity: "", billingProvince: "", consentAccepted: false };
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => { void validateToken(); });
</script>

<template>
  <main class="login-page customer-login-page">
    <section class="login-panel" aria-labelledby="customer-register-title">
      <a class="brand login-brand" href="/customer">xTech<span>JS</span></a>
      <p class="eyebrow">Alta de cliente</p>
      <h1 id="customer-register-title">Completa tu registro</h1>

      <p v-if="checkingToken" class="feedback info">Validando tu enlace de registro...</p>
      <p v-else-if="errorMessage" class="feedback error">{{ errorMessage }}</p>
      <p v-else class="feedback success">Vamos a completar tu perfil para {{ customerEmail || "tu cuenta" }}.</p>

      <form v-if="!checkingToken && !errorMessage" @submit.prevent="submit">
        <label><span>Correo electronico</span><input :value="customerEmail" disabled /></label>
        <label><span>Contraseña</span><input v-model="form.password" type="password" autocomplete="new-password" required minlength="12" /></label>
        <label><span>Confirmar contraseña</span><input v-model="form.passwordConfirm" type="password" autocomplete="new-password" required minlength="12" /></label>
        <label><span>Nombre fiscal / razon social</span><input v-model="form.billingName" required maxlength="160" /></label>
        <label><span>NIF / CIF / DNI</span><input v-model="form.billingTaxId" required maxlength="64" /></label>
        <label><span>Direccion fiscal</span><input v-model="form.billingAddress" required maxlength="500" /></label>
        <label><span>Codigo postal</span><input v-model="form.billingPostalCode" required maxlength="20" /></label>
        <label><span>Poblacion</span><input v-model="form.billingCity" required maxlength="120" /></label>
        <label><span>Provincia</span><input v-model="form.billingProvince" required maxlength="120" /></label>

        <label class="checkbox-row">
          <input v-model="form.consentAccepted" type="checkbox" required />
          <span>Acepto la autorizacion de tratamiento de datos para gestion de reparacion, facturacion y comunicaciones del servicio.</span>
        </label>

        <p v-if="passwordMismatch" class="feedback error">Las contraseñas no coinciden.</p>
        <p v-if="successMessage" class="feedback success">{{ successMessage }}</p>

        <button type="submit" :disabled="loading || passwordMismatch">
          {{ loading ? "Guardando registro" : "Completar registro" }}
        </button>
      </form>
    </section>
  </main>
</template>
