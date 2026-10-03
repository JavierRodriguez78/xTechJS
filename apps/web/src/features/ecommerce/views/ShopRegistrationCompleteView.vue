<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AddressFields, { type AddressFieldsValue } from "../../admin/views/AddressFields.vue";

const route = useRoute();
const token = typeof route.query.token === "string" ? route.query.token : "";
const email = ref("");
const verified = ref(false);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const complete = ref(false);
const form = ref({ displayName: "", phone: "", customerType: "" as "" | "individual" | "business", billingName: "", billingTaxId: "", password: "", passwordConfirm: "", consentAccepted: false, useContactAddressForBilling: false });
const contactAddress = ref<AddressFieldsValue>({ addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "" });
const billingAddress = ref<AddressFieldsValue>({ addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "" });
const hasContactAddress = computed(() => [contactAddress.value.addressStreet, contactAddress.value.addressPostalCode, contactAddress.value.addressCity, contactAddress.value.addressProvince].some(Boolean));
const passwordMismatch = computed(() => Boolean(form.value.passwordConfirm) && form.value.password !== form.value.passwordConfirm);
const consentText = "Autorizo el tratamiento de mis datos para la gestion de la reparacion, facturacion y comunicacion del estado del servicio.";
let addressStarted = false;
watch(hasContactAddress, (hasAddress) => { if (!addressStarted && hasAddress) form.value.useContactAddressForBilling = true; addressStarted = addressStarted || hasAddress; });

onMounted(async () => {
  if (!token) { error.value = "Falta el enlace de verificación."; loading.value = false; return; }
  try {
    const response = await fetch(`/api/shop/register/verify/${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error("El enlace de verificación no es válido o ha caducado.");
    const result = await response.json() as { email: string };
    email.value = result.email;
    verified.value = true;
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
});

async function submit(): Promise<void> {
  error.value = "";
  if (form.value.password.length < 12) { error.value = "La contraseña debe tener al menos 12 caracteres."; return; }
  if (passwordMismatch.value) { error.value = "Las contraseñas no coinciden."; return; }
  if (!form.value.consentAccepted) { error.value = "Debes aceptar la autorización de tratamiento de datos."; return; }
  saving.value = true;
  try {
    const response = await fetch(`/api/shop/register/verify/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: email.value,
        displayName: form.value.displayName,
        phone: form.value.phone || undefined,
        customerType: form.value.customerType || undefined,
        billingName: form.value.billingName || undefined,
        billingTaxId: form.value.billingTaxId || undefined,
        password: form.value.password,
        ...contactAddress.value,
        useContactAddressForBilling: form.value.useContactAddressForBilling,
        ...(form.value.useContactAddressForBilling ? {
          billingAddressStreet: contactAddress.value.addressStreet,
          billingAddressPostalCode: contactAddress.value.addressPostalCode,
          billingAddressCity: contactAddress.value.addressCity,
          billingAddressProvince: contactAddress.value.addressProvince,
          billingAddressCountry: contactAddress.value.addressCountry
        } : {
          billingAddressStreet: billingAddress.value.addressStreet || undefined,
          billingAddressPostalCode: billingAddress.value.addressPostalCode || undefined,
          billingAddressCity: billingAddress.value.addressCity || undefined,
          billingAddressProvince: billingAddress.value.addressProvince || undefined,
          billingAddressCountry: billingAddress.value.addressCountry || undefined
        }),
        consentAccepted: true,
        consentText
      })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(payload.message ?? "No se pudo completar el registro.");
    }
    complete.value = true;
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="login-page customer-login-page">
    <section class="login-panel shop-register-panel" aria-labelledby="shop-register-complete-title">
      <RouterLink class="brand login-brand" :to="{ name: 'shop.catalog' }">xTech<span>JS</span></RouterLink>
      <p class="eyebrow">Datos de la cuenta</p>
      <h1 id="shop-register-complete-title">{{ complete ? "Cuenta creada" : "Completa tu registro" }}</h1>
      <p v-if="loading" class="feedback info" role="status">Validando tu correo...</p>
      <p v-else-if="error && !verified" class="feedback error" role="alert">{{ error }}</p>
      <template v-else-if="complete">
        <p class="feedback success">Tu correo {{ email }} está verificado y tu cuenta ya está lista.</p>
        <RouterLink class="button-link shop-register-login" :to="{ name: 'customer.login' }">Acceder a mi cuenta</RouterLink>
      </template>
      <form v-else-if="verified" @submit.prevent="submit">
        <label><span>Correo electrónico</span><input :value="email" type="email" autocomplete="email" readonly /></label>
        <label><span>Nombre o razón social</span><input v-model="form.displayName" autocomplete="name" required maxlength="160" /></label>
        <label><span>Teléfono <small>Opcional</small></span><input v-model="form.phone" type="tel" autocomplete="tel" maxlength="64" /></label>
        <label><span>Tipo de cliente <small>Opcional</small></span><select v-model="form.customerType"><option value="">Sin especificar</option><option value="individual">Particular</option><option value="business">Empresa</option></select></label>
        <details class="shop-registration-address"><summary>Dirección de contacto <small>Opcional</small></summary><AddressFields v-model="contactAddress" legend="Dirección de contacto" public-catalog /></details>
        <label v-if="hasContactAddress" class="checkbox-row"><input v-model="form.useContactAddressForBilling" type="checkbox" /><span>Usar esta dirección para facturación</span></label>
        <fieldset>
          <legend>Datos de facturación <small>Opcionales</small></legend>
          <label><span>Nombre o razón social</span><input v-model="form.billingName" maxlength="160" /></label>
          <label><span>NIF/CIF</span><input v-model="form.billingTaxId" maxlength="64" /></label>
        </fieldset>
        <details v-if="!form.useContactAddressForBilling" class="shop-registration-address"><summary>Dirección fiscal <small>Opcional</small></summary><AddressFields v-model="billingAddress" legend="Dirección fiscal" public-catalog /></details>
        <label><span>Contraseña</span><input v-model="form.password" type="password" autocomplete="new-password" required minlength="12" maxlength="256" /></label>
        <label><span>Confirmar contraseña</span><input v-model="form.passwordConfirm" type="password" autocomplete="new-password" required minlength="12" maxlength="256" /></label>
        <label class="checkbox-row"><input v-model="form.consentAccepted" type="checkbox" required /><span>{{ consentText }}</span></label>
        <p v-if="passwordMismatch" class="feedback error">Las contraseñas no coinciden.</p>
        <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="saving || passwordMismatch">{{ saving ? "Creando cuenta" : "Crear cuenta" }}</button>
      </form>
    </section>
  </main>
</template>
