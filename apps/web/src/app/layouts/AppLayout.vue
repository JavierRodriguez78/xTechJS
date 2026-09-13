<script setup lang="ts">
import { useRouter } from "vue-router";
import { signOut, staffSession } from "../../features/auth/session";
const router = useRouter();
function logout(): void { signOut(); void router.push({ name: "staff.login" }); }
</script>
<template>
  <main class="workspace">
    <aside class="sidebar"><RouterLink class="brand" :to="{ name: 'customers.list' }">xTech<span>JS</span></RouterLink><nav aria-label="Navegacion principal"><RouterLink :to="{ name: 'customers.list' }">Clientes</RouterLink><span>Reparaciones</span><span>Almacen</span><span>TPV</span><span>Chat</span></nav><div class="profile"><strong>{{ staffSession?.user.displayName }}</strong><span>{{ staffSession?.user.role === "admin" ? "Administracion" : "Tecnico" }}</span><button class="logout" type="button" @click="logout">Salir</button></div></aside>
    <section class="content"><RouterView /></section>
  </main>
</template>