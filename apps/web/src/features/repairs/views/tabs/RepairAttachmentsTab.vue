<script setup lang="ts">
import { useRoute } from "vue-router";
import { staffSession } from "../../../auth/session";
import AttachmentsPanel from "../../../attachments/AttachmentsPanel.vue";

const route = useRoute();
</script>

<template>
  <section class="detail-tab">
    <h2>Adjuntos</h2>
    <AttachmentsPanel
      v-if="staffSession"
      :repair-id="String(route.params.id)"
      :token="staffSession.accessToken"
      :can-manage="staffSession.user.role === 'admin' || staffSession.user.role === 'technician'"
      mode="staff"
    />
  </section>
</template>
