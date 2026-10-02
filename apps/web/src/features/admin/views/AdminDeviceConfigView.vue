<script setup lang="ts">
import { onMounted, ref } from "vue";
import { addConfigValue, addRepairDeviceCatalogEntry, listDeviceTypes, listRepairDeviceCatalog, removeConfigValue, removeRepairDeviceCatalogEntry, type RepairDeviceCatalogEntry } from "../api";
const devices = ref<string[]>([]);
const catalog = ref<RepairDeviceCatalogEntry[]>([]);
const error = ref("");
const value = ref("");
const catalogForm = ref<RepairDeviceCatalogEntry>({ deviceType: "", brand: "", model: "", imageUrl: "" });
async function load(): Promise<void> { try { const [types, entries] = await Promise.all([listDeviceTypes(), listRepairDeviceCatalog()]); devices.value = types.values; catalog.value = entries.entries; if (!catalogForm.value.deviceType) catalogForm.value.deviceType = devices.value[0] ?? ""; } catch (reason) { error.value = (reason as Error).message; } }
async function add(): Promise<void> { if (!value.value.trim()) return; try { devices.value = (await addConfigValue("device-types", value.value)).values; value.value = ""; } catch (reason) { error.value = (reason as Error).message; } }
async function remove(device: string): Promise<void> { try { devices.value = (await removeConfigValue("device-types", device)).values; } catch (reason) { error.value = (reason as Error).message; } }
async function addCatalogEntry(): Promise<void> { try { catalog.value = (await addRepairDeviceCatalogEntry({ ...catalogForm.value, imageUrl: catalogForm.value.imageUrl || undefined })).entries; catalogForm.value.brand = ""; catalogForm.value.model = ""; catalogForm.value.imageUrl = ""; } catch (reason) { error.value = (reason as Error).message; } }
async function removeCatalogEntry(entry: RepairDeviceCatalogEntry): Promise<void> { try { catalog.value = (await removeRepairDeviceCatalogEntry(entry)).entries; } catch (reason) { error.value = (reason as Error).message; } }
onMounted(load);
</script>
<template>
  <section>
    <header>
      <div><p class="eyebrow">Administracion</p><h1>Tipos de dispositivo</h1></div>
    </header>
    <p v-if="error" class="feedback error">{{ error }}</p>
    <form class="filter-bar" @submit.prevent="add"><input v-model="value" placeholder="Nuevo tipo de dispositivo" /><button>Añadir</button></form>
    <div class="customer-list">
      <ul v-if="devices.length" class="customer-repair-items">
        <li v-for="device in devices" :key="device"><strong>{{ device }}</strong><span>Tipo disponible para nuevas reparaciones</span><button class="secondary" type="button" @click="remove(device)">Eliminar</button></li>
      </ul>
      <p v-else class="empty">No hay tipos de dispositivo configurados.</p>
    </div>
    <section class="detail-panel"><header><div><p class="eyebrow">Catalogo de equipos</p><h2>Marcas y modelos</h2></div></header><form class="filter-bar" @submit.prevent="addCatalogEntry"><select v-model="catalogForm.deviceType" required><option v-for="device in devices" :key="device" :value="device">{{ device }}</option></select><input v-model="catalogForm.brand" required placeholder="Marca" /><input v-model="catalogForm.model" required placeholder="Modelo" /><input v-model="catalogForm.imageUrl" type="url" placeholder="URL de imagen opcional" /><button>Añadir modelo</button></form><ul v-if="catalog.length" class="customer-repair-items"><li v-for="entry in catalog" :key="`${entry.deviceType}-${entry.brand}-${entry.model}`"><img v-if="entry.imageUrl" class="catalog-admin-image" :src="entry.imageUrl" :alt="entry.model" /><div><strong>{{ entry.brand }} {{ entry.model }}</strong><span>{{ entry.deviceType }}</span></div><button class="secondary" type="button" @click="removeCatalogEntry(entry)">Eliminar</button></li></ul><p v-else class="empty">Los tipos sin modelos configurados permiten introducir marca y modelo manualmente.</p></section>
  </section>
</template>
