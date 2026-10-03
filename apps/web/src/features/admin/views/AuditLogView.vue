<script setup lang="ts">
import { onMounted, ref } from "vue";
import { listAuditLogs, type AuditLogEntry } from "../api";
const entries = ref<AuditLogEntry[]>([]);
const error = ref("");
const loading = ref(true);
const formatDate = (value: string) => new Date(value).toLocaleString("es-ES");
onMounted(async () => { try { entries.value = await listAuditLogs(); } catch (reason) { error.value = (reason as Error).message; } finally { loading.value = false; } });
</script>
<template><section><header><div><p class="eyebrow">Administracion</p><h1>Auditoria</h1></div></header><p v-if="error" class="feedback error" role="alert">{{ error }}</p><div class="admin-table-wrap"><table class="admin-data-table admin-audit-table"><thead><tr><th scope="col">Acción</th><th scope="col">Actor</th><th scope="col">Destino</th><th scope="col">Fecha</th></tr></thead><tbody><tr v-if="loading"><td class="empty" colspan="4">Cargando eventos...</td></tr><tr v-else v-for="entry in entries" :key="entry.id"><th scope="row">{{ entry.action }}</th><td>{{ entry.actorName || entry.actorEmail || 'Sistema' }}</td><td>{{ entry.targetName || entry.targetEmail || 'Sin destino' }}</td><td>{{ formatDate(entry.createdAt) }}</td></tr><tr v-if="!loading && !entries.length"><td class="empty" colspan="4">No hay eventos registrados.</td></tr></tbody></table></div></section></template>
