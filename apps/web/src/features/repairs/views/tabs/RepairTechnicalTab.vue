<script setup lang="ts">
import { inject, onMounted, ref, type Ref } from "vue";
import { getWorkflowConfig, listTechnicians, updateStatus, updateTechnical, type Repair } from "../../api";
import { repairStatusLabel } from "../../status-labels";

const repair = inject<Ref<Repair | null>>("repair");
const technicians = ref<{ id: string; displayName: string }[]>([]);
const statuses = ref<string[]>([]);
const diagnosis = ref("");
const technicianId = ref("");
const error = ref("");

onMounted(async () => {
  diagnosis.value = repair?.value?.diagnosis ?? "";
  technicianId.value = repair?.value?.technicianId ?? "";
  try {
    const [staff, config] = await Promise.all([listTechnicians(), getWorkflowConfig()]);
    technicians.value = staff;
    statuses.value = config.statuses;
  } catch (reason) {
    error.value = (reason as Error).message;
  }
});

async function save(): Promise<void> {
  if (!repair?.value) return;
  error.value = "";
  try {
    repair.value = await updateTechnical(repair.value.id, { technicianId: technicianId.value || undefined, diagnosis: diagnosis.value || undefined });
  } catch (reason) {
    error.value = (reason as Error).message;
  }
}

// El backend puede rechazar la transicion (estado no configurado o salto no
// permitido); el select vuelve al estado real y se muestra el motivo.
async function changeStatus(event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement;
  const current = repair?.value;
  if (!current) return;
  error.value = "";
  try {
    repair.value = await updateStatus(current.id, select.value);
  } catch (reason) {
    error.value = (reason as Error).message;
    select.value = current.status;
  }
}
</script>
<template>
  <form v-if="repair" class="entity-form" @submit.prevent="save">
    <fieldset>
      <legend>Diagnostico tecnico</legend>
      <label>Estado<select :value="repair.status" @change="changeStatus"><option v-for="item in statuses" :key="item" :value="item">{{ repairStatusLabel(item) }}</option></select></label>
      <label>Tecnico<select v-model="technicianId"><option value="">Sin asignar</option><option v-for="technician in technicians" :key="technician.id" :value="technician.id">{{ technician.displayName }}</option></select></label>
      <label>Diagnostico<textarea v-model="diagnosis" rows="5" /></label>
    </fieldset>
    <p v-if="error" class="feedback error">{{ error }}</p>
    <footer><button>Guardar diagnostico</button></footer>
  </form>
</template>
