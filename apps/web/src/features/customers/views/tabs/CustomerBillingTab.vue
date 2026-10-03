<script setup lang="ts">
import { inject, type Ref } from "vue";
import type { Customer } from "../../api";
const customer = inject<Ref<Customer | null>>("customer");
</script>
<template><section v-if="customer" class="detail-tab"><h2>Datos de facturación</h2><dl><dt>Tipo de cliente</dt><dd>{{ customer.customerType === "individual" ? "Particular" : customer.customerType === "business" ? "Empresa" : "Sin especificar" }}</dd><dt>Razón social</dt><dd>{{ customer.billingName || "Pendiente de registro" }}</dd><dt>NIF/CIF</dt><dd>{{ customer.billingTaxId || customer.taxId || "Pendiente de registro" }}</dd><dt>Dirección fiscal</dt><dd>{{ [customer.billingAddressStreet, customer.billingAddressPostalCode, customer.billingAddressCity, customer.billingAddressProvince, customer.billingAddressCountry].filter(Boolean).join(", ") || "Pendiente de registro" }}</dd></dl></section></template>