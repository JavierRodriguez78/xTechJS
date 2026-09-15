<script setup lang="ts">
import { onMounted, ref } from "vue";
import { listAuditLogs, type AuditLogEntry } from "../api";
const entries = ref<AuditLogEntry[]>([]);
const error = ref("");
const formatDate = (value: string) => new Date(value).toLocaleString("es-ES");
onMounted(async () => { try { entries.value = await listAuditLogs(); } catch (reason) { error.value = (reason as Error).message; } });
</script>
<template><section><header><div><p class="eyebrow">Administracion</p><h1>Auditoria</h1></div></header><p v-if="error" class="feedback error">{{ error }}</p><div class="customer-list"><p v-if="!entries.length" class="empty">No hay eventos registrados.</p><ul v-else class="customer-repair-items"><li v-for="entry in entries" :key="entry.id"><strong>{{ entry.action }}</strong><span>{{ entry.actorName || entry.actorEmail || 'Sistema' }} → {{ entry.targetName || entry.targetEmail || 'Sin destino' }}</span><em>{{ formatDate(entry.createdAt) }}</em></li></ul></div></section></template>
