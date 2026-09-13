<script setup lang="ts">
import { inject, type Ref } from "vue";
import type { Customer } from "../../api";
const customer = inject<Ref<Customer | null>>("customer");
</script>
<template><section v-if="customer" class="detail-tab"><h2>Datos de contacto</h2><dl><dt>Email</dt><dd>{{ customer.email || "No indicado" }}</dd><dt>Telefono</dt><dd>{{ customer.phone || "No indicado" }}</dd><dt>Direccion</dt><dd>{{ customer.address || "No indicada" }}</dd><dt>NIF/DNI</dt><dd>{{ customer.taxId || "No indicado" }}</dd></dl></section></template>