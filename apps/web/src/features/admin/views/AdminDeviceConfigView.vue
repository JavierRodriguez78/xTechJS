<script setup lang="ts">
import { onMounted, ref } from "vue";
import { listDeviceTypes } from "../api";
const devices = ref<string[]>([]);
const error = ref("");
onMounted(async () => { try { const result = await listDeviceTypes(); devices.value = result.values; } catch (reason) { error.value = (reason as Error).message; } });
</script>
<template>
  <section>
    <header>
      <div><p class="eyebrow">Administracion</p><h1>Tipos de dispositivo</h1></div>
    </header>
    <p v-if="error" class="feedback error">{{ error }}</p>
    <div class="customer-list">
      <ul v-if="devices.length" class="customer-repair-items">
        <li v-for="device in devices" :key="device"><strong>{{ device }}</strong><span>Tipo disponible para nuevas reparaciones</span></li>
      </ul>
      <p v-else class="empty">No hay tipos de dispositivo configurados.</p>
    </div>
  </section>
</template>
