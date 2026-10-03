<script setup lang="ts">
import { onMounted, ref } from "vue";
import { createIntegrationApiKey, listIntegrationApiKeys, revokeIntegrationApiKey, type IntegrationApiKey } from "../api";

const keys = ref<IntegrationApiKey[]>([]);
const name = ref("");
const visibleKey = ref("");
const loading = ref(true);
const saving = ref(false);
const busyId = ref("");
const error = ref("");
const feedback = ref("");
const copied = ref(false);
const date = (value: string | null) => value ? new Date(value).toLocaleString("es-ES") : "Nunca";

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try { keys.value = await listIntegrationApiKeys(); }
  catch (reason) { error.value = (reason as Error).message; }
  finally { loading.value = false; }
}

async function create(): Promise<void> {
  error.value = "";
  feedback.value = "";
  visibleKey.value = "";
  saving.value = true;
  try {
    const result = await createIntegrationApiKey(name.value);
    visibleKey.value = result.key;
    feedback.value = "Copia y guarda esta clave ahora; no volverá a mostrarse.";
    name.value = "";
    await load();
  } catch (reason) { error.value = (reason as Error).message; }
  finally { saving.value = false; }
}

async function revoke(key: IntegrationApiKey): Promise<void> {
  if (!window.confirm(`¿Revocar la clave de ${key.name}? La integración dejará de poder enviar datos.`)) return;
  busyId.value = key.id;
  error.value = "";
  try { await revokeIntegrationApiKey(key.id); await load(); }
  catch (reason) { error.value = (reason as Error).message; }
  finally { busyId.value = ""; }
}

async function copyKey(): Promise<void> {
  try { await navigator.clipboard.writeText(visibleKey.value); copied.value = true; }
  catch { error.value = "No se pudo copiar automáticamente. Selecciona la clave y cópiala manualmente."; }
}

onMounted(load);
</script>

<template>
  <section class="integration-keys-view">
    <header><div><p class="eyebrow">Almacén · Integraciones</p><h1>Claves de API</h1></div></header>
    <form class="integration-key-create" @submit.prevent="create"><label>Nombre de la integración<input v-model="name" required maxlength="160" placeholder="repuestos-watch" /></label><button :disabled="saving">{{ saving ? "Generando" : "Generar clave" }}</button></form>
    <section v-if="visibleKey" class="integration-key-once" aria-labelledby="new-key-title"><div><p class="eyebrow">Clave de un solo acceso</p><h2 id="new-key-title">{{ feedback }}</h2></div><div class="integration-key-value"><code>{{ visibleKey }}</code><button type="button" class="secondary" @click="copyKey">{{ copied ? "Copiada" : "Copiar clave" }}</button></div></section>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <div class="integration-key-table-wrap"><table class="integration-key-table"><thead><tr><th scope="col">Integración</th><th scope="col">Permiso</th><th scope="col">Creada</th><th scope="col">Último uso</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>
      <tr v-if="loading"><td colspan="6" class="empty">Cargando claves...</td></tr>
      <tr v-else-if="!keys.length"><td colspan="6" class="empty">No hay claves configuradas.</td></tr>
      <tr v-for="key in keys" v-else :key="key.id"><th scope="row">{{ key.name }}</th><td><code>{{ key.scope }}</code></td><td>{{ date(key.createdAt) }}</td><td>{{ date(key.lastUsedAt) }}</td><td><span :class="['status-pill', key.active ? 'completed' : 'pending']">{{ key.active ? "Activa" : "Revocada" }}</span></td><td><button v-if="key.active" type="button" class="secondary" :disabled="busyId === key.id" @click="revoke(key)">Revocar</button><span v-else class="empty">—</span></td></tr>
    </tbody></table></div>
  </section>
</template>

<style scoped>
.integration-keys-view { max-width: 1100px; min-width: 0; }
header { margin-bottom: 22px; }
.integration-key-create { align-items: end; border-bottom: 1px solid #cbd7d0; display: flex; gap: 12px; margin-bottom: 20px; padding-bottom: 20px; }
.integration-key-create label { color: #49675a; display: grid; flex: 1; font-size: 12px; font-weight: 700; gap: 6px; }
.integration-key-create input { background: #fff; border: 1px solid #b5c9bd; border-radius: 4px; font: inherit; min-height: 40px; padding: 8px 10px; }
.integration-key-once { background: #fff5d9; border: 1px solid #e8ca77; display: grid; gap: 12px; margin-bottom: 22px; padding: 16px; }
.integration-key-once h2 { font-size: 14px; }
.integration-key-value { align-items: center; display: flex; gap: 10px; min-width: 0; }
.integration-key-value code { background: #fff; border: 1px solid #e8ca77; flex: 1; overflow-wrap: anywhere; padding: 10px; }
.integration-key-table-wrap { border: 1px solid #cbd7d0; overflow-x: auto; }
.integration-key-table { border-collapse: collapse; min-width: 800px; text-align: left; width: 100%; }
.integration-key-table thead { background: #e2ebe5; }
.integration-key-table th, .integration-key-table td { border-bottom: 1px solid #d6dfda; padding: 12px 14px; vertical-align: middle; }
.integration-key-table thead th { color: #60766d; font-family: "DM Mono", monospace; font-size: 10px; font-weight: 500; text-transform: uppercase; white-space: nowrap; }
.integration-key-table tbody th { color: #173c36; font-size: 12px; }
.integration-key-table tbody td { color: #49675a; font-size: 11px; }
.integration-key-table code { font-size: 10px; }
.integration-key-table .empty { padding: 24px; text-align: center; }
@media (max-width: 600px) { .integration-key-create { align-items: stretch; flex-direction: column; }.integration-key-value { align-items: stretch; flex-direction: column; } }
</style>
