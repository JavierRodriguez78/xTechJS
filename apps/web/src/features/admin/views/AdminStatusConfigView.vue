<script setup lang="ts">
import { onMounted, ref } from "vue";
import { addConfigValue, listRepairStatuses, removeConfigValue } from "../api";
const statuses = ref<string[]>([]);
const error = ref("");
const value = ref("");
async function load(): Promise<void> { try { statuses.value = (await listRepairStatuses()).values; } catch (reason) { error.value = (reason as Error).message; } }
async function add(): Promise<void> { if (!value.value.trim()) return; try { statuses.value = (await addConfigValue("repair-statuses", value.value)).values; value.value = ""; } catch (reason) { error.value = (reason as Error).message; } }
async function remove(status: string): Promise<void> { try { statuses.value = (await removeConfigValue("repair-statuses", status)).values; } catch (reason) { error.value = (reason as Error).message; } }
onMounted(load);
</script>
<template>
  <section>
    <header>
      <div><p class="eyebrow">Administracion</p><h1>Estados de reparacion</h1></div>
    </header>
    <p v-if="error" class="feedback error">{{ error }}</p>
    <form class="filter-bar" @submit.prevent="add"><input v-model="value" placeholder="Nuevo estado" /><button>Añadir</button></form>
    <div class="customer-list">
      <ul v-if="statuses.length" class="customer-repair-items">
        <li v-for="status in statuses" :key="status"><strong>{{ status }}</strong><span>Estado disponible en el flujo de taller</span><button class="secondary" type="button" @click="remove(status)">Eliminar</button></li>
      </ul>
      <p v-else class="empty">No hay estados configurados.</p>
    </div>
  </section>
</template>
