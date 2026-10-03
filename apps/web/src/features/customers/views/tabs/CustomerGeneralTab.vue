<script setup lang="ts">
import { inject, type Ref } from "vue";
import type { Customer } from "../../api";
const customer = inject<Ref<Customer | null>>("customer");
</script>
<template><section v-if="customer" class="detail-tab"><h2>Datos de contacto</h2><dl><dt>Email</dt><dd>{{ customer.email || "No indicado" }}</dd><dt>Telefono</dt><dd>{{ customer.phone || "No indicado" }}</dd><dt>Tipo de cliente</dt><dd>{{ customer.customerType === "individual" ? "Particular" : customer.customerType === "business" ? "Empresa" : "Sin especificar" }}</dd><dt>Dirección</dt><dd>{{ [customer.addressStreet, customer.addressPostalCode, customer.addressCity, customer.addressProvince, customer.addressCountry].filter(Boolean).join(", ") || "No indicada" }}</dd><template v-if="customer.address"><dt>Dirección antigua</dt><dd>{{ customer.address }} <small>(sin estructurar)</small></dd></template><dt>NIF/NIE/CIF</dt><dd>{{ customer.taxId || "No indicado" }}</dd></dl></section></template>