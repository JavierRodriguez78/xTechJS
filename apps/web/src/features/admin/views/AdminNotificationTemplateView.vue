<script setup lang="ts">
import { onMounted, ref } from "vue";
import { addConfigValue, listNotificationTemplates, removeConfigValue } from "../api";
const templates = ref<string[]>([]);
const error = ref("");
const value = ref("");
async function load(): Promise<void> { try { templates.value = (await listNotificationTemplates()).values; } catch (reason) { error.value = (reason as Error).message; } }
async function add(): Promise<void> { if (!value.value.trim()) return; try { templates.value = (await addConfigValue("notification-templates", value.value)).values; value.value = ""; } catch (reason) { error.value = (reason as Error).message; } }
async function remove(template: string): Promise<void> { try { templates.value = (await removeConfigValue("notification-templates", template)).values; } catch (reason) { error.value = (reason as Error).message; } }
onMounted(load);
</script>
<template>
  <section>
    <header>
      <div><p class="eyebrow">Administracion</p><h1>Plantillas de notificacion</h1></div>
    </header>
    <p v-if="error" class="feedback error">{{ error }}</p>
    <form class="filter-bar" @submit.prevent="add"><input v-model="value" placeholder="Nueva plantilla" /><button>Añadir</button></form>
    <div class="customer-list">
      <ul v-if="templates.length" class="customer-repair-items">
        <li v-for="template in templates" :key="template"><strong>{{ template }}</strong><span>Plantilla disponible para notificaciones del taller</span><button class="secondary" type="button" @click="remove(template)">Eliminar</button></li>
      </ul>
      <p v-else class="empty">No hay plantillas configuradas.</p>
    </div>
  </section>
</template>
