<script setup lang="ts">
import { useRouter } from "vue-router";
import { signOut, staffSession } from "../../features/auth/session";
const router = useRouter();
function logout(): void { signOut(); void router.push({ name: "staff.login" }); }
</script>
<template>
  <main class="workspace">
    <aside class="sidebar"><RouterLink class="brand" :to="{ name: 'customers.list' }">xTech<span>JS</span></RouterLink><nav aria-label="Navegacion principal"><RouterLink :to="{ name: 'customers.list' }">Clientes</RouterLink><RouterLink :to="{ name: 'repairs.list' }">Reparaciones</RouterLink><RouterLink :to="{ name: 'inventory.list' }">Almacen</RouterLink><RouterLink :to="{ name: 'payments.list' }">TPV</RouterLink><RouterLink v-if="staffSession?.user.role === 'admin'" :to="{ name: 'admin.users.list' }">Usuarios</RouterLink><RouterLink v-if="staffSession?.user.role === 'admin'" :to="{ name: 'admin.audit.list' }">Auditoria</RouterLink><RouterLink v-if="staffSession?.user.role === 'admin'" :to="{ name: 'admin.config.statuses' }">Estados</RouterLink><RouterLink v-if="staffSession?.user.role === 'admin'" :to="{ name: 'admin.config.devices' }">Dispositivos</RouterLink><RouterLink v-if="staffSession?.user.role === 'admin'" :to="{ name: 'admin.config.templates' }">Plantillas</RouterLink><span>Chat</span></nav><div class="profile"><strong>{{ staffSession?.user.displayName }}</strong><span>{{ staffSession?.user.role === "admin" ? "Administracion" : "Tecnico" }}</span><button class="logout" type="button" @click="logout">Salir</button></div></aside>
    <section class="content"><RouterView /></section>
  </main>
</template>