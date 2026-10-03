<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AddressFields, { type AddressFieldsValue } from "../admin/views/AddressFields.vue";

const params = new URLSearchParams(window.location.search);
const token = params.get("token") ?? "";

const loading = ref(false);
const checkingToken = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const registration = ref<Record<string, string | null> | null>(null);
const editing = ref<Record<string, boolean>>({});
const form = ref({
  displayName: "",
  phone: "",
  taxId: "",
  customerType: "" as "" | "individual" | "business",
  password: "",
  passwordConfirm: "",
  billingName: "",
  billingTaxId: "",
  useContactAddressForBilling: false,
  consentAccepted: false
});
const contactAddress = ref<AddressFieldsValue>({ addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "" });
const billingAddress = ref<AddressFieldsValue>({ addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "" });
const customerEmail = ref("");

const passwordMismatch = computed(() => form.value.password !== "" && form.value.passwordConfirm !== "" && form.value.password !== form.value.passwordConfirm);
const contactAddressPrefilled = computed(() => Boolean(registration.value && ["addressStreet", "addressPostalCode", "addressCity", "addressProvince", "addressCountry"].some((field) => registration.value?.[field])));
const billingAddressPrefilled = computed(() => Boolean(registration.value && ["billingAddressStreet", "billingAddressPostalCode", "billingAddressCity", "billingAddressProvince", "billingAddressCountry"].some((field) => registration.value?.[field])));
const contactAddressReadonly = computed(() => Object.fromEntries((Object.keys(contactAddress.value) as (keyof AddressFieldsValue)[]).map((field) => [field, Boolean(registration.value?.[field] && !editing.value.contactAddress)])) as Partial<Record<keyof AddressFieldsValue, boolean>>);
const billingAddressReadonly = computed(() => Object.fromEntries((Object.keys(billingAddress.value) as (keyof AddressFieldsValue)[]).map((field) => [field, Boolean(registration.value?.[`billing${field[0].toUpperCase()}${field.slice(1)}`] && !editing.value.billingAddress)])) as Partial<Record<keyof AddressFieldsValue, boolean>>);
const consentText = "Autorizo el tratamiento de mis datos para la gestion de la reparacion, facturacion y comunicacion del estado del servicio.";
function readOnly(field: string, value: string | null | undefined): boolean { return Boolean(value && !editing.value[field]); }
function beginEdit(field: string): void { editing.value[field] = true; }

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
    const payload = await response.json() as Record<string, string | null> & { email: string };
    registration.value = payload;
    customerEmail.value = payload.email ?? "";
    form.value.displayName = payload.displayName ?? "";
    form.value.phone = payload.phone ?? "";
    form.value.taxId = payload.taxId ?? "";
    form.value.customerType = (payload.customerType as "individual" | "business" | null) ?? "";
    form.value.billingName = payload.billingName ?? "";
    form.value.billingTaxId = payload.billingTaxId ?? payload.taxId ?? "";
    contactAddress.value = { addressStreet: payload.addressStreet ?? "", addressPostalCode: payload.addressPostalCode ?? "", addressCity: payload.addressCity ?? "", addressProvince: payload.addressProvince ?? "", addressCountry: payload.addressCountry ?? "" };
    billingAddress.value = { addressStreet: payload.billingAddressStreet ?? "", addressPostalCode: payload.billingAddressPostalCode ?? "", addressCity: payload.billingAddressCity ?? "", addressProvince: payload.billingAddressProvince ?? "", addressCountry: payload.billingAddressCountry ?? "" };
    const contactHasAddress = [contactAddress.value.addressStreet, contactAddress.value.addressPostalCode, contactAddress.value.addressCity, contactAddress.value.addressProvince].some(Boolean);
    const billingHasAddress = Object.values(billingAddress.value).some(Boolean);
    const addressesMatch = (Object.keys(contactAddress.value) as (keyof AddressFieldsValue)[]).every((field) => contactAddress.value[field] === billingAddress.value[field]);
    form.value.useContactAddressForBilling = contactHasAddress && (!billingHasAddress || addressesMatch);
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
        displayName: form.value.displayName || undefined,
        phone: form.value.phone || undefined,
        taxId: form.value.taxId || undefined,
        customerType: form.value.customerType || undefined,
        ...contactAddress.value,
        billingName: form.value.billingName,
        billingTaxId: form.value.billingTaxId,
        useContactAddressForBilling: form.value.useContactAddressForBilling,
        ...(form.value.useContactAddressForBilling ? {} : {
          billingAddressStreet: billingAddress.value.addressStreet,
          billingAddressPostalCode: billingAddress.value.addressPostalCode,
          billingAddressCity: billingAddress.value.addressCity,
          billingAddressProvince: billingAddress.value.addressProvince,
          billingAddressCountry: billingAddress.value.addressCountry
        }),
        consentAccepted: true,
        consentText
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: "No se pudo completar el registro." }));
      throw new Error(payload.message ?? "No se pudo completar el registro.");
    }

    successMessage.value = "Registro completado correctamente. Ya puedes iniciar sesion en el portal del cliente.";
    form.value.password = "";
    form.value.passwordConfirm = "";
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
        <div class="registration-field-with-edit"><label><span>Nombre o razon social</span><input v-model="form.displayName" :readonly="readOnly('displayName', registration?.displayName)" required maxlength="160" /></label><button v-if="readOnly('displayName', registration?.displayName)" class="secondary prefilled-edit" type="button" @click="beginEdit('displayName')">Editar</button></div>
        <div class="registration-field-with-edit"><label><span>Telefono</span><input v-model="form.phone" :readonly="readOnly('phone', registration?.phone)" maxlength="64" /></label><button v-if="readOnly('phone', registration?.phone)" class="secondary prefilled-edit" type="button" @click="beginEdit('phone')">Editar</button></div>
        <div class="registration-field-with-edit"><label><span>Tipo de cliente</span><select v-model="form.customerType" :disabled="readOnly('customerType', registration?.customerType)"><option value="">Sin especificar</option><option value="individual">Particular</option><option value="business">Empresa</option></select></label><button v-if="readOnly('customerType', registration?.customerType)" class="secondary prefilled-edit" type="button" @click="beginEdit('customerType')">Editar</button></div>
        <p v-if="registration?.address" class="feedback info">Dirección antigua sin estructurar: {{ registration.address }}</p>
        <button v-if="contactAddressPrefilled && !editing.contactAddress" class="secondary prefilled-edit" type="button" @click="beginEdit('contactAddress')">Editar dirección de contacto</button>
        <AddressFields v-model="contactAddress" legend="Dirección de contacto" :public-catalog="true" :readonly-fields="contactAddressReadonly" />
        <label><span>Contraseña</span><input v-model="form.password" type="password" autocomplete="new-password" required minlength="12" /></label>
        <label><span>Confirmar contraseña</span><input v-model="form.passwordConfirm" type="password" autocomplete="new-password" required minlength="12" /></label>
        <div class="registration-field-with-edit"><label><span>Nombre fiscal / razon social</span><input v-model="form.billingName" :readonly="readOnly('billingName', registration?.billingName)" :required="!registration?.billingName || editing.billingName" maxlength="160" /></label><button v-if="readOnly('billingName', registration?.billingName)" class="secondary prefilled-edit" type="button" @click="beginEdit('billingName')">Editar</button></div>
        <div class="registration-field-with-edit"><label><span>NIF / CIF / DNI</span><input v-model="form.billingTaxId" :readonly="readOnly('billingTaxId', registration?.billingTaxId || registration?.taxId)" :required="!registration?.billingTaxId && !registration?.taxId || editing.billingTaxId" maxlength="64" /></label><button v-if="readOnly('billingTaxId', registration?.billingTaxId || registration?.taxId)" class="secondary prefilled-edit" type="button" @click="beginEdit('billingTaxId')">Editar</button></div>
        <label v-if="contactAddressPrefilled || billingAddressPrefilled" class="checkbox-row"><input v-model="form.useContactAddressForBilling" type="checkbox" /><span>Usar la misma dirección de contacto para facturación</span></label>
        <button v-if="billingAddressPrefilled && !form.useContactAddressForBilling && !editing.billingAddress" class="secondary prefilled-edit" type="button" @click="beginEdit('billingAddress')">Editar dirección fiscal</button>
        <AddressFields v-if="!form.useContactAddressForBilling" v-model="billingAddress" legend="Dirección fiscal" :required="true" :public-catalog="true" :readonly-fields="billingAddressReadonly" />

        <label class="checkbox-row">
          <input v-model="form.consentAccepted" type="checkbox" required />
          <span>Acepto la autorización de tratamiento de datos para la gestión de reparación, facturación y comunicaciones del servicio.</span>
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

<style scoped>
.registration-field-with-edit { align-items: end; display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr) auto; }
.registration-field-with-edit .prefilled-edit { margin-top: 0; min-height: 40px; padding: 8px 10px; width: auto; }
</style>
