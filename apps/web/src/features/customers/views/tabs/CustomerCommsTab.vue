<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getCustomerCommunications, type CustomerCommunication } from "../../api";

const route = useRoute();
const communications = ref<CustomerCommunication[]>([]);
const loading = ref(true);
const error = ref("");

const typeLabel = (type: CustomerCommunication["type"]) => ({ registration_invitation: "Invitación de registro", invoice_email: "Factura", repair_notification: "Aviso de reparación" })[type] ?? type;
const statusLabel = (status: CustomerCommunication["status"]) => ({ pending: "Pendiente", sent: "Enviado", failed: "Fallido" })[status];

onMounted(async () => {
  try {
    communications.value = await getCustomerCommunications(String(route.params.id));
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="detail-tab">
    <h2>Comunicaciones</h2>
    <p v-if="loading" class="empty">Cargando comunicaciones...</p>
    <p v-else-if="error" class="feedback error">{{ error }}</p>
    <p v-else-if="!communications.length" class="empty">No hay comunicaciones registradas para este cliente.</p>
    <ul v-else class="customer-repair-items">
      <li v-for="communication in communications" :key="communication.id">
        <strong>{{ typeLabel(communication.type) }}</strong>
        <span>{{ communication.subject }} · {{ communication.recipient }}</span>
        <span :class="['status-pill', communication.status === 'sent' ? 'completed' : communication.status === 'failed' ? 'cancelled' : 'pending']">{{ statusLabel(communication.status) }}</span>
        <em>{{ new Date(communication.createdAt).toLocaleString("es-ES") }}</em>
        <small v-if="communication.errorMessage" class="feedback error">{{ communication.errorMessage }}</small>
      </li>
    </ul>
  </section>
</template>