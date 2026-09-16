<script setup lang="ts">
import { useRoute } from "vue-router";
import { staffSession } from "../../../auth/session";
import ChatPanel from "../../../chat/ChatPanel.vue";

const route = useRoute();
</script>

<template>
  <section class="detail-tab">
    <h2>Mensajes</h2>
    <ChatPanel
      v-if="staffSession"
      :repair-id="String(route.params.id)"
      :token="staffSession.accessToken"
      :current-sender-id="staffSession.user.id"
      mode="staff"
    />
  </section>
</template>
