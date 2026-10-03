<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import AddressFields, { type AddressFieldsValue } from "../../admin/views/AddressFields.vue";
import { createCustomer, type CustomerInput } from "../api";

const router = useRouter();
const form = ref<CustomerInput>({ displayName: "", email: "" });
const contactAddress = ref<AddressFieldsValue>({ addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "" });
const billingAddress = ref<AddressFieldsValue>({ addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "" });
const useContactAddressForBilling = ref(false);
const error = ref("");
const saving = ref(false);
let contactAddressStarted = false;
watch(() => Object.values(contactAddress.value).some(Boolean), (hasAddress) => {
	if (hasAddress && !contactAddressStarted) useContactAddressForBilling.value = true;
	contactAddressStarted = contactAddressStarted || hasAddress;
});

async function save(): Promise<void> {
	saving.value = true;
	error.value = "";
	try {
		const customer = await createCustomer({
			...form.value,
			customerType: form.value.customerType || undefined,
			...contactAddress.value,
			useContactAddressForBilling: useContactAddressForBilling.value,
			...(useContactAddressForBilling.value ? {} : {
				billingAddressStreet: billingAddress.value.addressStreet,
				billingAddressPostalCode: billingAddress.value.addressPostalCode,
				billingAddressCity: billingAddress.value.addressCity,
				billingAddressProvince: billingAddress.value.addressProvince,
				billingAddressCountry: billingAddress.value.addressCountry
			})
		});
		void router.push({ name: "customers.detail.general", params: { id: customer.id } });
	} catch (reason) {
		error.value = (reason as Error).message;
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<form class="entity-form" @submit.prevent="save">
		<header><div><p class="eyebrow">CRM</p><h1>Nuevo cliente</h1></div></header>
		<fieldset>
			<legend>Datos de contacto</legend>
			<label>Nombre o razón social<input v-model="form.displayName" required maxlength="160" /></label>
			<label>Email<input v-model="form.email" type="email" required maxlength="320" /></label>
			<label>Teléfono<input v-model="form.phone" type="tel" maxlength="64" /></label>
			<label>Tipo de cliente<select v-model="form.customerType"><option value="">Sin especificar</option><option value="individual">Particular</option><option value="business">Empresa</option></select></label>
			<label>NIF/NIE/CIF<input v-model="form.taxId" maxlength="64" /></label>
		</fieldset>
		<AddressFields v-model="contactAddress" legend="Dirección de contacto" />
		<fieldset>
			<legend>Datos de facturación</legend>
			<label>Nombre o razón social<input v-model="form.billingName" maxlength="160" /></label>
			<label>NIF/CIF<input v-model="form.billingTaxId" maxlength="64" /></label>
			<label class="checkbox-row"><input v-model="useContactAddressForBilling" type="checkbox" /><span>Usar la misma dirección de contacto para facturación</span></label>
		</fieldset>
		<AddressFields v-if="!useContactAddressForBilling" v-model="billingAddress" legend="Dirección fiscal" />
		<p v-if="error" class="feedback error" role="alert">{{ error }}</p>
		<footer><button class="secondary" type="button" @click="router.back()">Cancelar</button><button :disabled="saving">{{ saving ? "Guardando" : "Guardar cliente" }}</button></footer>
	</form>
</template>