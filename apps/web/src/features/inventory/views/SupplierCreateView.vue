<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import AddressFields, { type AddressFieldsValue } from "../../admin/views/AddressFields.vue";
import { createSupplier } from "../api";

interface SupplierCreateForm extends AddressFieldsValue {
  name: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  paymentTermDays: number | null;
  category: string;
  notes: string;
  website: string;
}

const router = useRouter();
const saving = ref(false);
const error = ref("");
const form = ref<SupplierCreateForm>({
  name: "",
  legalName: "",
  taxId: "",
  email: "",
  phone: "",
  secondaryPhone: "",
  addressStreet: "",
  addressPostalCode: "",
  addressCity: "",
  addressProvince: "",
  addressCountry: "",
  paymentTermDays: null,
  category: "",
  notes: "",
  website: ""
});
const address = computed<AddressFieldsValue>({
  get: () => form.value,
  set: (value) => Object.assign(form.value, value)
});

function setPaymentTerm(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  form.value.paymentTermDays = value === "" ? null : Number(value);
}

async function save(): Promise<void> {
  saving.value = true;
  error.value = "";
  try {
    const supplier = await createSupplier({
      ...form.value,
      email: form.value.email || undefined,
      phone: form.value.phone || undefined,
      secondaryPhone: form.value.secondaryPhone || null,
      legalName: form.value.legalName || null,
      taxId: form.value.taxId || null,
      addressStreet: form.value.addressStreet || null,
      addressPostalCode: form.value.addressPostalCode || null,
      addressCity: form.value.addressCity || null,
      addressProvince: form.value.addressProvince || null,
      addressCountry: form.value.addressCountry || null,
      category: form.value.category || null,
      notes: form.value.notes || undefined,
      website: form.value.website || null
    });
    await router.push({ name: "suppliers.detail.general", params: { id: supplier.id } });
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="supplier-create-view">
    <p class="breadcrumb"><RouterLink :to="{ name: 'suppliers.list' }">Proveedores</RouterLink> / Nuevo</p>
    <header><div><p class="eyebrow">Almacen</p><h1>Nuevo proveedor</h1></div></header>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <form class="entity-form supplier-create-form" @submit.prevent="save">
      <fieldset>
        <legend>Identificacion y contacto</legend>
        <label>Nombre comercial<input v-model="form.name" required maxlength="180" /></label>
        <label>Razon social<input v-model="form.legalName" maxlength="200" /></label>
        <label>NIF / CIF<input v-model="form.taxId" maxlength="80" /></label>
        <label>Email<input v-model="form.email" type="email" maxlength="320" /></label>
        <label>Telefono<input v-model="form.phone" type="tel" maxlength="64" /></label>
        <label>Telefono secundario<input v-model="form.secondaryPhone" type="tel" maxlength="64" /></label>
      </fieldset>
      <AddressFields v-model="address" legend="Direccion fiscal" />
      <fieldset>
        <legend>Condiciones comerciales</legend>
        <label>Categoria<input v-model="form.category" maxlength="120" /></label>
        <label>Plazo de pago (dias)<input :value="form.paymentTermDays ?? ''" type="number" min="0" max="60" @input="setPaymentTerm" /></label>
        <label>Web<input v-model="form.website" type="url" maxlength="2000" /></label>
        <label class="wide">Notas<textarea v-model="form.notes" maxlength="2000" rows="4" /></label>
      </fieldset>
      <footer>
        <RouterLink class="button-link secondary" :to="{ name: 'suppliers.list' }">Cancelar</RouterLink>
        <button :disabled="saving">{{ saving ? "Guardando..." : "Crear proveedor" }}</button>
      </footer>
    </form>
  </section>
</template>

<style scoped>
.supplier-create-view header { margin: 18px 0 28px; }
.supplier-create-view h1 { font-size: 30px; }
.supplier-create-form { margin: 0; max-width: 1000px; }
.supplier-create-form fieldset { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.supplier-create-form label, .supplier-create-form input, .supplier-create-form select, .supplier-create-form textarea { min-width: 0; }
.supplier-create-form .wide { grid-column: 1 / -1; }
.supplier-create-form footer { display: flex; gap: 12px; justify-content: flex-end; }
@media (max-width: 600px) { .supplier-create-form fieldset { grid-template-columns: 1fr; }.supplier-create-form .wide { grid-column: auto; }.supplier-create-form footer { flex-direction: column-reverse; }.supplier-create-form footer > * { width: 100%; } }
</style>
