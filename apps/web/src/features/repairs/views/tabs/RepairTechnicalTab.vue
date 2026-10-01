<script setup lang="ts">
import { inject, onMounted, ref, type Ref } from "vue";
import { addRepairStep, downloadTechnicalReport, getWorkflowConfig, listRepairSteps, listTechnicians, updateStatus, updateTechnical, type Repair, type RepairStep } from "../../api";
import { repairStatusLabel } from "../../status-labels";
import { staffSession } from "../../../auth/session";
import AttachmentsPanel from "../../../attachments/AttachmentsPanel.vue";

const repair = inject<Ref<Repair | null>>("repair");
const technicians = ref<{ id: string; displayName: string }[]>([]);
const statuses = ref<string[]>([]);
const diagnosis = ref("");
const technicianId = ref("");
const error = ref("");
const steps = ref<RepairStep[]>([]);
const stepTitle = ref("");
const stepDescription = ref("");
const stepDate = ref(new Date().toISOString().slice(0, 16));

onMounted(async () => {
  diagnosis.value = repair?.value?.diagnosis ?? "";
  technicianId.value = repair?.value?.technicianId ?? "";
  try {
    const [staff, config, repairSteps] = await Promise.all([listTechnicians(), getWorkflowConfig(), repair?.value ? listRepairSteps(repair.value.id) : Promise.resolve([])]);
    technicians.value = staff;
    statuses.value = config.statuses;
    steps.value = repairSteps;
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

async function addStep(): Promise<void> {
  if (!repair?.value || !stepTitle.value.trim()) return;
  error.value = "";
  try {
    const step = await addRepairStep(repair.value.id, { title: stepTitle.value, description: stepDescription.value || undefined, performedAt: new Date(stepDate.value).toISOString() });
    steps.value = [...steps.value, step];
    stepTitle.value = "";
    stepDescription.value = "";
  } catch (reason) { error.value = (reason as Error).message; }
}

async function downloadReport(): Promise<void> {
  if (!repair?.value) return;
  try {
    const url = URL.createObjectURL(await downloadTechnicalReport(repair.value.id));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `informe-tecnico-${repair.value.id.slice(0, 8)}.pdf`; anchor.click(); URL.revokeObjectURL(url);
  } catch (reason) { error.value = (reason as Error).message; }
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
  <section v-if="repair" class="detail-panel">
    <header><h2>Bitácora técnica</h2><button type="button" class="secondary" @click="downloadReport">Descargar informe técnico (PDF)</button></header>
    <form class="entity-form" @submit.prevent="addStep">
      <label>Título<input v-model="stepTitle" maxlength="200" required /></label>
      <label>Fecha y hora<input v-model="stepDate" type="datetime-local" required /></label>
      <label>Descripción<textarea v-model="stepDescription" rows="3" /></label>
      <footer><button>Añadir paso</button></footer>
    </form>
    <ol class="timeline-list">
      <li v-for="step in steps" :key="step.id"><strong>{{ step.sequence }}. {{ step.title }}</strong><span>{{ new Date(step.performedAt).toLocaleString("es-ES") }}</span><p v-if="step.description">{{ step.description }}</p><AttachmentsPanel :repair-id="repair.id" :repair-step-id="step.id" :token="staffSession?.accessToken ?? ''" mode="staff" :can-manage="true" /></li>
      <li v-if="!steps.length" class="empty">No se han registrado pasos técnicos.</li>
    </ol>
  </section>
</template>
