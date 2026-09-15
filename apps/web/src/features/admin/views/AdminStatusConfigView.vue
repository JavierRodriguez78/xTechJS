<script setup lang="ts">
import { onMounted, ref } from "vue";
import { listRepairStatuses } from "../api";
const statuses = ref<string[]>([]);
const error = ref("");
onMounted(async () => { try { const result = await listRepairStatuses(); statuses.value = result.values; } catch (reason) { error.value = (reason as Error).message; } });
</script>
<template>
  <section>
    <header>
      <div><p class="eyebrow">Administracion</p><h1>Estados de reparacion</h1></div>
    </header>
    <p v-if="error" class="feedback error">{{ error }}</p>
    <div class="customer-list">
      <ul v-if="statuses.length" class="customer-repair-items">
        <li v-for="status in statuses" :key="status"><strong>{{ status }}</strong><span>Estado disponible en el flujo de taller</span></li>
      </ul>
      <p v-else class="empty">No hay estados configurados.</p>
    </div>
  </section>
</template>
