<script setup lang="ts">
import { onMounted, provide, ref } from "vue";
import { useRoute } from "vue-router";
import { listUsers, type AdminUser } from "../api";
const route = useRoute(); const user = ref<AdminUser | null>(null); provide("adminUser", user);
onMounted(async () => { user.value = (await listUsers()).find((item) => item.id === route.params.id) ?? null; });
</script>
<template><section v-if="user" class="customer-detail"><p class="breadcrumb"><RouterLink :to="{ name: 'admin.users.list' }">Usuarios</RouterLink> / {{ user.displayName }}</p><header><div><p class="eyebrow">Cuenta</p><h1>{{ user.displayName }}</h1><span :class="['status-pill', user.active ? 'completed' : 'pending']">{{ user.active ? 'Activo' : 'Inactivo' }}</span></div><RouterLink class="button-link" :to="{ name: 'admin.users.edit', params: { id: user.id } }">Editar</RouterLink></header><nav class="tab-nav"><RouterLink :to="{ name: 'admin.users.detail.general' }">General</RouterLink><RouterLink :to="{ name: 'admin.users.detail.permissions' }">Permisos</RouterLink></nav><RouterView /></section><p v-else class="empty">Cargando usuario...</p></template>