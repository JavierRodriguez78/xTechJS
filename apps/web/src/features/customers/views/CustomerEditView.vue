<script setup lang="ts">
import { onMounted, ref } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import AddressFields, { type AddressFieldsValue } from "../../admin/views/AddressFields.vue";
import { getCustomer, updateCustomer, type CustomerInput } from "../api";

const route = useRoute();
const router = useRouter();
const form = ref<CustomerInput>({ displayName: "", email: "" });
const contactAddress = ref<AddressFieldsValue>({ addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "" });
const billingAddress = ref<AddressFieldsValue>({ addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "" });
const useContactAddressForBilling = ref(false);
const legacyAddress = ref("");
const original = ref("");
const error = ref("");
const saving = ref(false);

onMounted(async () => {
	try {
		const customer = await getCustomer(String(route.params.id));
		form.value = {
			displayName: customer.displayName,
			email: customer.email ?? "",
			phone: customer.phone ?? undefined,
			taxId: customer.taxId ?? undefined,
			customerType: customer.customerType ?? undefined,
			internalNotes: customer.internalNotes ?? undefined,
			billingName: customer.billingName ?? undefined,
			billingTaxId: customer.billingTaxId ?? undefined,
			tags: customer.tags
		};
		legacyAddress.value = customer.address ?? "";
		contactAddress.value = { addressStreet: customer.addressStreet ?? "", addressPostalCode: customer.addressPostalCode ?? "", addressCity: customer.addressCity ?? "", addressProvince: customer.addressProvince ?? "", addressCountry: customer.addressCountry ?? "" };
		billingAddress.value = { addressStreet: customer.billingAddressStreet ?? "", addressPostalCode: customer.billingAddressPostalCode ?? "", addressCity: customer.billingAddressCity ?? "", addressProvince: customer.billingAddressProvince ?? "", addressCountry: customer.billingAddressCountry ?? "" };
		const hasContactAddress = Object.values(contactAddress.value).some(Boolean);
		const billingIsEmpty = Object.values(billingAddress.value).every((value) => !value);
		const addressesMatch = Object.keys(contactAddress.value).every((key) => contactAddress.value[key as keyof AddressFieldsValue] === billingAddress.value[key as keyof AddressFieldsValue]);
		useContactAddressForBilling.value = hasContactAddress && (billingIsEmpty || addressesMatch);
		original.value = JSON.stringify({ form: form.value, contactAddress: contactAddress.value, billingAddress: billingAddress.value, useContactAddressForBilling: useContactAddressForBilling.value });
	} catch (reason) {
		error.value = (reason as Error).message;
	}
});

function currentForm(): string { return JSON.stringify({ form: form.value, contactAddress: contactAddress.value, billingAddress: billingAddress.value, useContactAddressForBilling: useContactAddressForBilling.value }); }
onBeforeRouteLeave(() => !saving.value && currentForm() !== original.value ? window.confirm("Hay cambios sin guardar. ¿Deseas salir?") : true);

async function save(): Promise<void> {
	saving.value = true;
	error.value = "";
	try {
		await updateCustomer(String(route.params.id), {
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
		void router.push({ name: "customers.detail.general", params: { id: route.params.id } });
	} catch (reason) {
		error.value = (reason as Error).message;
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<form class="entity-form" @submit.prevent="save">
		<header><div><p class="eyebrow">CRM</p><h1>Editar cliente</h1></div></header>
		<p v-if="legacyAddress" class="feedback">Dirección antigua sin estructurar: {{ legacyAddress }}</p>
		<fieldset>
			<legend>Datos de contacto</legend>
			<label>Nombre<input v-model="form.displayName" required maxlength="160" /></label>
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
		<fieldset><legend>Notas internas</legend><label>Notas<textarea v-model="form.internalNotes" rows="5" /></label></fieldset>
		<p v-if="error" class="feedback error" role="alert">{{ error }}</p>
		<footer><button class="secondary" type="button" @click="router.back()">Cancelar</button><button :disabled="saving">{{ saving ? "Guardando" : "Guardar cambios" }}</button></footer>
	</form>
</template>