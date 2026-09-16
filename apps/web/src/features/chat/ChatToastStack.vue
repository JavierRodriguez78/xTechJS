<script setup lang="ts">
import { chatToasts, dismissToast } from "./notifications";

const emit = defineEmits<{ select: [repairOrderId: string] }>();

function open(repairOrderId: string, toastId: string): void {
  dismissToast(toastId);
  emit("select", repairOrderId);
}
</script>

<template>
  <div class="chat-toast-stack">
    <button v-for="toast in chatToasts" :key="toast.id" type="button" class="chat-toast" @click="open(toast.repairOrderId, toast.id)">
      <strong>{{ toast.senderName }}</strong>
      <span>{{ toast.preview }}</span>
    </button>
  </div>
</template>
