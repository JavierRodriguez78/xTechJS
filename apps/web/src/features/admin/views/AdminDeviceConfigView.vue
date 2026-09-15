<script setup lang="ts">
import { onMounted, ref } from "vue";
import { addConfigValue, listDeviceTypes, removeConfigValue } from "../api";
const devices = ref<string[]>([]);
const error = ref("");
const value = ref("");
async function load(): Promise<void> { try { devices.value = (await listDeviceTypes()).values; } catch (reason) { error.value = (reason as Error).message; } }
async function add(): Promise<void> { if (!value.value.trim()) return; try { devices.value = (await addConfigValue("device-types", value.value)).values; value.value = ""; } catch (reason) { error.value = (reason as Error).message; } }
async function remove(device: string): Promise<void> { try { devices.value = (await removeConfigValue("device-types", device)).values; } catch (reason) { error.value = (reason as Error).message; } }
onMounted(load);
</script>
<template>
  <section>
    <header>
      <div><p class="eyebrow">Administracion</p><h1>Tipos de dispositivo</h1></div>
    </header>
    <p v-if="error" class="feedback error">{{ error }}</p>
    <form class="filter-bar" @submit.prevent="add"><input v-model="value" placeholder="Nuevo tipo de dispositivo" /><button>Añadir</button></form>
    <div class="customer-list">
      <ul v-if="devices.length" class="customer-repair-items">
        <li v-for="device in devices" :key="device"><strong>{{ device }}</strong><span>Tipo disponible para nuevas reparaciones</span><button class="secondary" type="button" @click="remove(device)">Eliminar</button></li>
      </ul>
      <p v-else class="empty">No hay tipos de dispositivo configurados.</p>
    </div>
  </section>
</template>
