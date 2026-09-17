<script setup lang="ts">
import { onMounted, ref } from "vue";
import { addConfigValue, listRepairStatuses, removeConfigValue } from "../api";
import { repairStatusLabel } from "../../repairs/status-labels";
const statuses = ref<string[]>([]);
const error = ref("");
const value = ref("");
async function load(): Promise<void> { try { statuses.value = (await listRepairStatuses()).values; } catch (reason) { error.value = (reason as Error).message; } }
async function add(): Promise<void> { if (!value.value.trim()) return; error.value = ""; try { statuses.value = (await addConfigValue("repair-statuses", value.value)).values; value.value = ""; } catch (reason) { error.value = (reason as Error).message; } }
async function remove(status: string): Promise<void> { error.value = ""; try { statuses.value = (await removeConfigValue("repair-statuses", status)).values; } catch (reason) { error.value = (reason as Error).message; } }
onMounted(load);
</script>
<template>
  <section>
    <header>
      <div><p class="eyebrow">Administracion</p><h1>Estados de reparacion</h1></div>
    </header>
    <p class="empty">
      Los estados de esta lista son los que el taller puede seleccionar en una orden. Un estado que se retira deja de
      poder asignarse, y uno nuevo queda disponible de inmediato en la ficha de reparacion.
    </p>
    <p v-if="error" class="feedback error">{{ error }}</p>
    <form class="filter-bar" @submit.prevent="add"><input v-model="value" placeholder="Nuevo estado" /><button>Añadir</button></form>
    <div class="customer-list">
      <ul v-if="statuses.length" class="customer-repair-items">
        <li v-for="status in statuses" :key="status"><strong>{{ repairStatusLabel(status) }}</strong><span>{{ status }}</span><button class="secondary" type="button" @click="remove(status)">Eliminar</button></li>
      </ul>
      <p v-else class="empty">No hay estados configurados.</p>
    </div>
  </section>
</template>
