<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Socket } from "socket.io-client";
import { getChatSocket } from "./socket";
import { markRepairRead } from "./notifications";
import { listMessages, sendMessage, type ChatMessage, type ChatMode } from "./api";

const props = defineProps<{ repairId: string; token: string; mode: ChatMode; currentSenderId?: string }>();

const messages = ref<ChatMessage[]>([]);
const draft = ref("");
const loading = ref(true);
const errorMessage = ref("");
const sending = ref(false);
const activeRepairId = ref(props.repairId);
let socket: Socket | undefined;

function onIncomingMessage(message: ChatMessage): void {
  if (message.repairOrderId !== props.repairId) return;
  if (messages.value.some((existing) => existing.id === message.id)) return;
  messages.value.push(message);
  markRepairRead(props.repairId);
}

// The server registers its "chat.join" listener only after resolving the connection
// asynchronously, so the very first join right after "connect" can race and be lost; retry with ack.
function joinRoom(repairId: string, attempt = 0): void {
  if (!socket) return;
  socket.timeout(2000).emit("chat.join", { repairOrderId: repairId }, (error: unknown, ack: { ok: boolean } | undefined) => {
    if ((error || !ack?.ok) && attempt < 3) joinRoom(repairId, attempt + 1);
  });
}

// Rooms aren't preserved across reconnects, so re-join the currently open repair every time.
function onSocketConnect(): void {
  joinRoom(activeRepairId.value);
}

async function connect(): Promise<void> {
  socket = getChatSocket(props.token);
  socket.on("chat.message", onIncomingMessage);
  socket.on("connect", onSocketConnect);
  if (socket.connected) joinRoom(activeRepairId.value);
}

async function load(): Promise<void> {
  loading.value = true;
  errorMessage.value = "";
  try {
    messages.value = await listMessages(props.mode, props.repairId, props.token);
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    loading.value = false;
  }
}

async function send(): Promise<void> {
  const body = draft.value.trim();
  if (!body || sending.value) return;
  sending.value = true;
  errorMessage.value = "";
  try {
    const message = await sendMessage(props.mode, props.repairId, props.token, body);
    if (!messages.value.some((existing) => existing.id === message.id)) messages.value.push(message);
    draft.value = "";
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    sending.value = false;
  }
}

function isOwnMessage(message: ChatMessage): boolean {
  return props.currentSenderId ? message.senderId === props.currentSenderId : false;
}

onMounted(async () => {
  await load();
  await connect();
  markRepairRead(props.repairId);
});

onBeforeUnmount(() => {
  socket?.emit("chat.leave", { repairOrderId: activeRepairId.value });
  socket?.off("chat.message", onIncomingMessage);
  socket?.off("connect", onSocketConnect);
});

watch(() => props.repairId, async (next, previous) => {
  if (previous) socket?.emit("chat.leave", { repairOrderId: previous });
  activeRepairId.value = next;
  await load();
  joinRoom(next);
  markRepairRead(next);
});

const orderedMessages = computed(() => [...messages.value].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
</script>

<template>
  <section class="chat-panel">
    <p v-if="loading" class="empty">Cargando mensajes...</p>
    <p v-if="errorMessage" class="feedback error">{{ errorMessage }}</p>
    <ul v-if="!loading" class="chat-messages">
      <li v-for="message in orderedMessages" :key="message.id" :class="['chat-message', { own: isOwnMessage(message) }]">
        <p class="chat-message-meta"><strong>{{ message.senderName }}</strong> · {{ new Date(message.createdAt).toLocaleString("es-ES") }}</p>
        <p class="chat-message-body">{{ message.body }}</p>
      </li>
      <li v-if="!orderedMessages.length" class="empty">Todavía no hay mensajes en esta reparación.</li>
    </ul>
    <form class="chat-composer" @submit.prevent="send">
      <textarea v-model="draft" rows="2" maxlength="2000" placeholder="Escribe un mensaje..." :disabled="sending"></textarea>
      <button type="submit" :disabled="sending || !draft.trim()">Enviar</button>
    </form>
  </section>
</template>
