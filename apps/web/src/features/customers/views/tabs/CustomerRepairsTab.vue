<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getCustomerRepairs } from "../../api";
const route = useRoute(); const repairs = ref<Awaited<ReturnType<typeof getCustomerRepairs>>>([]); const error = ref("");
onMounted(async () => { try { repairs.value = await getCustomerRepairs(String(route.params.id)); } catch (reason) { error.value = (reason as Error).message; } });
</script>
<template><section class="detail-tab"><h2>Historial de reparaciones</h2><p v-if="error" class="feedback error">{{ error }}</p><p v-else-if="!repairs.length" class="empty">Este cliente no tiene reparaciones registradas.</p><ul v-else class="customer-repair-items"><li v-for="repair in repairs" :key="repair.id"><strong>{{ repair.brand }} {{ repair.model }}</strong><span>{{ repair.deviceType }} - {{ repair.reportedIssue }}</span><em>{{ repair.status }}</em></li></ul></section></template>