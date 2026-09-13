<script setup lang="ts">
import { inject, type Ref } from "vue";
import type { Customer } from "../../api";
const customer = inject<Ref<Customer | null>>("customer");
</script>
<template><section v-if="customer" class="detail-tab"><h2>Datos de facturacion</h2><dl><dt>Razon social</dt><dd>{{ customer.billingName || "Pendiente de registro" }}</dd><dt>NIF/CIF</dt><dd>{{ customer.billingTaxId || "Pendiente de registro" }}</dd><dt>Direccion fiscal</dt><dd>{{ customer.billingAddress || "Pendiente de registro" }}</dd><dt>Localidad</dt><dd>{{ [customer.billingPostalCode, customer.billingCity, customer.billingProvince].filter(Boolean).join(", ") || "Pendiente de registro" }}</dd></dl></section></template>