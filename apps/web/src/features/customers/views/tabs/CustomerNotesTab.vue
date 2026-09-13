<script setup lang="ts">
import { inject, type Ref } from "vue";
import type { Customer } from "../../api";
const customer = inject<Ref<Customer | null>>("customer");
</script>
<template><section v-if="customer" class="detail-tab"><h2>Notas y etiquetas</h2><p>{{ customer.internalNotes || "No hay notas internas." }}</p><div class="tag-list"><span v-for="tag in customer.tags" :key="tag" class="tag">{{ tag }}</span><span v-if="!customer.tags.length" class="empty">Sin etiquetas</span></div></section></template>