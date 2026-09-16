<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { signOut, staffSession } from "../../features/auth/session";
import { startChatNotifications, stopChatNotifications, totalChatUnread } from "../../features/chat/notifications";
import ChatToastStack from "../../features/chat/ChatToastStack.vue";
const router = useRouter();
function logout(): void { signOut(); stopChatNotifications(); void router.push({ name: "staff.login" }); }
function openChat(repairOrderId: string): void { void router.push({ name: "repairs.detail.chat", params: { id: repairOrderId } }); }
watch(staffSession, (session) => { if (session) startChatNotifications(session.accessToken, session.user.id); }, { immediate: true });
onMounted(() => { if (staffSession.value) startChatNotifications(staffSession.value.accessToken, staffSession.value.user.id); });
</script>
<template>
  <main class="workspace">
    <ChatToastStack @select="openChat" />
    <aside class="sidebar"><RouterLink class="brand" :to="{ name: 'customers.list' }">xTech<span>JS</span></RouterLink><nav aria-label="Navegacion principal"><RouterLink :to="{ name: 'customers.list' }">Clientes</RouterLink><RouterLink :to="{ name: 'repairs.list' }">Reparaciones<span v-if="totalChatUnread()" class="chat-badge">{{ totalChatUnread() }}</span></RouterLink><RouterLink :to="{ name: 'inventory.list' }">Almacen</RouterLink><RouterLink :to="{ name: 'payments.list' }">TPV</RouterLink><RouterLink v-if="staffSession?.user.role === 'admin'" :to="{ name: 'admin.users.list' }">Usuarios</RouterLink><RouterLink v-if="staffSession?.user.role === 'admin'" :to="{ name: 'admin.audit.list' }">Auditoria</RouterLink><RouterLink v-if="staffSession?.user.role === 'admin'" :to="{ name: 'admin.config.statuses' }">Estados</RouterLink><RouterLink v-if="staffSession?.user.role === 'admin'" :to="{ name: 'admin.config.devices' }">Dispositivos</RouterLink><RouterLink v-if="staffSession?.user.role === 'admin'" :to="{ name: 'admin.config.templates' }">Plantillas</RouterLink></nav><div class="profile"><strong>{{ staffSession?.user.displayName }}</strong><span>{{ staffSession?.user.role === "admin" ? "Administracion" : "Tecnico" }}</span><button class="logout" type="button" @click="logout">Salir</button></div></aside>
    <section class="content"><RouterView /></section>
  </main>
</template>