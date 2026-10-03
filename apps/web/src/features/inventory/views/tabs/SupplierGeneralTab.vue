<script setup lang="ts">
import { inject, reactive, ref, watch, type Ref } from "vue";
import AddressFields, { type AddressFieldsValue } from "../../../admin/views/AddressFields.vue";
import { deactivateSupplier, reactivateSupplier, updateSupplier, type Supplier, type SupplierInput } from "../../api";

const supplier = inject<Ref<Supplier | null>>("supplier", ref(null));
const form = reactive<SupplierInput>({ name: "" });
const address = reactive<AddressFieldsValue>({ addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "" });
const paymentTerm = ref<number | null>(null);
const error = ref("");
const saving = ref(false);
const saved = ref(false);

function setPaymentTerm(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  paymentTerm.value = value === "" ? null : Number(value);
}

watch(supplier, (value) => {
  if (!value) return;
  Object.assign(form, { name: value.name, legalName: value.legalName ?? "", taxId: value.taxId ?? "", email: value.email ?? "", phone: value.phone ?? "", secondaryPhone: value.secondaryPhone ?? "", category: value.category ?? "", notes: value.notes ?? "", website: value.website ?? "" });
  Object.assign(address, { addressStreet: value.addressStreet ?? "", addressPostalCode: value.addressPostalCode ?? "", addressCity: value.addressCity ?? "", addressProvince: value.addressProvince ?? "", addressCountry: value.addressCountry ?? "" });
  paymentTerm.value = value.paymentTermDays ?? null;
}, { immediate: true });

async function save(): Promise<void> {
  if (!supplier?.value) return;
  saving.value = true;
  error.value = "";
  saved.value = false;
  try {
    supplier.value = await updateSupplier(supplier.value.id, { ...form, ...address, email: form.email || null, website: form.website || null, paymentTermDays: paymentTerm.value });
    saved.value = true;
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    saving.value = false;
  }
}

async function changeStatus(): Promise<void> {
  if (!supplier?.value) return;
  if (supplier.value.active && !window.confirm("Dar de baja este proveedor? El historico de pedidos y catalogo se conservara.")) return;
  error.value = "";
  try {
    supplier.value = supplier.value.active ? await deactivateSupplier(supplier.value.id) : await reactivateSupplier(supplier.value.id);
  } catch (reason) {
    error.value = (reason as Error).message;
  }
}
</script>

<template>
  <section v-if="supplier" class="detail-tab">
    <form class="operation-form supplier-form" @submit.prevent="save">
      <div class="supplier-form-heading"><h2>Datos fiscales y de contacto</h2><button class="secondary" type="button" @click="changeStatus">{{ supplier.active ? "Dar de baja" : "Reactivar" }}</button></div>
      <p v-if="!supplier.active" class="feedback">Proveedor dado de baja el {{ supplier.deactivatedAt ? new Date(supplier.deactivatedAt).toLocaleDateString('es-ES') : "-" }}. Sus pedidos y catalogo siguen disponibles.</p>
      <div class="supplier-form-grid">
        <label>Nombre comercial<input v-model="form.name" maxlength="180" required /></label>
        <label>Razon social<input v-model="form.legalName" maxlength="200" /></label>
        <label>NIF / CIF<input v-model="form.taxId" maxlength="80" /></label>
        <label>Categoria<input v-model="form.category" maxlength="120" /></label>
        <label>Email<input v-model="form.email" type="email" maxlength="320" /></label>
        <label>Telefono<input v-model="form.phone" maxlength="64" /></label>
        <label>Telefono secundario<input v-model="form.secondaryPhone" maxlength="64" /></label>
        <label>Plazo de pago (dias)<input :value="paymentTerm ?? ''" type="number" min="0" max="60" @input="setPaymentTerm" /></label>
        <label>Web<input v-model="form.website" type="url" maxlength="2000" /></label>
      </div>
      <AddressFields v-model="address" legend="Direccion fiscal" />
      <label class="supplier-notes">Notas<textarea v-model="form.notes" maxlength="2000" rows="4" /></label>
      <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
      <p v-if="saved" class="feedback" role="status">Cambios guardados.</p>
      <button :disabled="saving">{{ saving ? "Guardando..." : "Guardar cambios" }}</button>
    </form>
  </section>
</template>

<style scoped>
.supplier-form { max-width: 860px; }
.supplier-form-heading { align-items: center; display: flex; gap: 16px; justify-content: space-between; }
.supplier-form-grid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.supplier-form-grid label, .supplier-notes { display: grid; gap: 6px; }
.supplier-notes { margin: 16px 0; }
@media (max-width: 600px) { .supplier-form-grid { grid-template-columns: 1fr; }.supplier-form-heading { align-items: flex-start; flex-direction: column; } }
</style>
