<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { listNotificationTemplates, removeNotificationTemplate, saveNotificationTemplate, type NotificationTemplate } from "../api";
import { getWorkflowConfig } from "../../repairs/api";
import { repairStatusLabel } from "../../repairs/status-labels";

const templates = ref<NotificationTemplate[]>([]);
const placeholders = ref<string[]>([]);
const statuses = ref<string[]>([]);
const loading = ref(true);
const error = ref("");
const feedback = ref("");
const editing = ref<{ key: string; subject: string; body: string; enabled: boolean; isNew: boolean } | null>(null);

const statusFromKey = (key: string) => key.startsWith("repair.status.") ? key.slice("repair.status.".length) : "";
// Los marcadores se construyen aqui: escribir `{{nombre}}` en la plantilla Vue
// lo interpretaria el propio compilador como una interpolacion.
const placeholderTokens = computed(() => placeholders.value.map((name) => `{{${name}}}`));
const configuredStatuses = computed(() => statuses.value.filter((status) => !templates.value.some((template) => statusFromKey(template.key) === status)));

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [list, config] = await Promise.all([listNotificationTemplates(), getWorkflowConfig()]);
    templates.value = list.templates;
    placeholders.value = list.placeholders;
    statuses.value = config.statuses;
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
}

function startEdit(template: NotificationTemplate): void {
  feedback.value = "";
  editing.value = { key: template.key, subject: template.subject, body: template.body, enabled: template.enabled, isNew: false };
}

function startCreate(): void {
  feedback.value = "";
  editing.value = { key: "", subject: "", body: "", enabled: true, isNew: true };
}

async function save(): Promise<void> {
  if (!editing.value) return;
  error.value = "";
  try {
    const saved = await saveNotificationTemplate({ key: editing.value.key, subject: editing.value.subject, body: editing.value.body, enabled: editing.value.enabled });
    const index = templates.value.findIndex((template) => template.key === saved.key);
    if (index === -1) templates.value = [...templates.value, saved].sort((left, right) => left.key.localeCompare(right.key));
    else templates.value[index] = saved;
    feedback.value = `Plantilla "${saved.key}" guardada.`;
    editing.value = null;
  } catch (reason) {
    error.value = (reason as Error).message;
  }
}

async function remove(template: NotificationTemplate): Promise<void> {
  if (!window.confirm(`¿Eliminar la plantilla "${template.key}"? Los cambios a ese estado dejaran de avisar al cliente.`)) return;
  error.value = "";
  try {
    await removeNotificationTemplate(template.key);
    templates.value = templates.value.filter((entry) => entry.key !== template.key);
    if (editing.value?.key === template.key) editing.value = null;
    feedback.value = `Plantilla "${template.key}" eliminada.`;
  } catch (reason) {
    error.value = (reason as Error).message;
  }
}

onMounted(load);
</script>
<template>
  <section>
    <header>
      <div><p class="eyebrow">Administracion</p><h1>Plantillas de notificacion</h1></div>
      <button v-if="!editing" type="button" @click="startCreate">Nueva plantilla</button>
    </header>

    <p class="empty">
      Cada plantilla se aplica al pasar una reparacion al estado correspondiente. Un estado sin plantilla, o con la
      plantilla desactivada, no genera aviso al cliente. Marcadores disponibles:
      <code v-for="token in placeholderTokens" :key="token">{{ token }}</code>
    </p>

    <p v-if="error" class="feedback error">{{ error }}</p>
    <p v-if="feedback" class="feedback">{{ feedback }}</p>

    <form v-if="editing" class="entity-form" @submit.prevent="save">
      <fieldset>
        <legend>{{ editing.isNew ? "Nueva plantilla" : `Editar ${editing.key}` }}</legend>
        <label v-if="editing.isNew">Estado de la reparacion
          <select v-model="editing.key" required>
            <option disabled value="">Selecciona el estado que dispara el aviso</option>
            <option v-for="status in configuredStatuses" :key="status" :value="`repair.status.${status}`">{{ repairStatusLabel(status) }}</option>
          </select>
        </label>
        <label>Asunto<input v-model="editing.subject" maxlength="320" required /></label>
        <label>Cuerpo<textarea v-model="editing.body" rows="10" required /></label>
        <label class="checkbox-row"><input v-model="editing.enabled" type="checkbox" /><span>Enviar este aviso al cliente</span></label>
      </fieldset>
      <footer>
        <button class="secondary" type="button" @click="editing = null">Cancelar</button>
        <button>Guardar plantilla</button>
      </footer>
    </form>

    <div class="customer-list">
      <div v-if="loading" v-for="item in 3" :key="item" class="skeleton-row" />
      <ul v-else-if="templates.length" class="customer-repair-items">
        <li v-for="template in templates" :key="template.key">
          <strong>{{ statusFromKey(template.key) ? repairStatusLabel(statusFromKey(template.key)) : template.key }}</strong>
          <span>{{ template.subject }}</span>
          <span :class="['status-pill', template.enabled ? 'completed' : 'pending']">{{ template.enabled ? "Activa" : "Desactivada" }}</span>
          <em>{{ new Date(template.updatedAt).toLocaleString("es-ES") }}</em>
          <button type="button" @click="startEdit(template)">Editar</button>
          <button class="secondary" type="button" @click="remove(template)">Eliminar</button>
        </li>
      </ul>
      <p v-else class="empty">No hay plantillas configuradas: ningun cambio de estado avisa todavia al cliente.</p>
    </div>
  </section>
</template>
