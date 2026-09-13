<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { listItems, getMovements, type Item, type Movement } from "../../../inventory/api";
import { staffSession } from "../../../auth/session";

const route = useRoute();
const items = ref<Item[]>([]);
const movements = ref<Movement[]>([]);
const itemId = ref("");
const quantity = ref(1);
const error = ref("");

async function load(): Promise<void> {
  [items.value, movements.value] = await Promise.all([listItems(), getMovementsForRepair()]);
}

async function getMovementsForRepair(): Promise<Movement[]> {
  const allItems = items.value.length ? items.value : await listItems();
  const results = await Promise.all(allItems.map((item) => getMovements(item.id)));
  return results.flat().filter((movement) => movement.repairOrderId === String(route.params.id));
}

async function consume(): Promise<void> {
  if (!itemId.value) return;
  error.value = "";
  const response = await fetch(`/api/inventory/${itemId.value}/consume`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` },
    body: JSON.stringify({ repairOrderId: route.params.id, quantity: quantity.value, note: "Consumo desde la orden de reparacion" })
  });
  if (!response.ok) { error.value = (await response.json().catch(() => ({ message: "No se pudo registrar el consumo." }))).message; return; }
  itemId.value = "";
  quantity.value = 1;
  await load();
}

onMounted(() => { void load(); });
</script>
<template><section class="detail-tab"><h2>Materiales consumidos</h2><form class="inline-form" @submit.prevent="consume"><label>Material<select v-model="itemId" required><option disabled value="">Selecciona material</option><option v-for="item in items" :key="item.id" :value="item.id">{{ item.name }} ({{ item.stock }} {{ item.unit }})</option></select></label><label>Cantidad<input v-model.number="quantity" min="1" type="number" required /></label><button>Registrar consumo</button></form><p v-if="error" class="feedback error">{{ error }}</p><ul class="customer-repair-items"><li v-for="movement in movements" :key="movement.id"><strong>{{ Math.abs(movement.quantity) }} unidades</strong><span>{{ movement.note || "Consumo de reparacion" }}</span><em>{{ new Date(movement.createdAt).toLocaleString("es-ES") }}</em></li></ul><p v-if="!movements.length" class="empty">No hay materiales consumidos en esta reparacion.</p></section></template>