<script setup lang="ts">
import { computed } from "vue";
import { repairStatusLabel } from "../../repairs/status-labels";

interface StatusCount { status?: string; count: number; }
const props = defineProps<{ items: StatusCount[] }>();
const palette = ["#e9871a", "#168f86", "#294b70", "#d94d36", "#d7ad00", "#4a9f5b", "#6b8589", "#bb4545"];
const statusColors: Record<string, string> = {
  received: "#6b8589",
  diagnosing: "#e9871a",
  quoted: "#168f86",
  approved: "#294b70",
  repairing: "#d94d36",
  testing: "#d7ad00",
  repaired: "#4a9f5b",
  delivered: "#168f86",
  unrepairable: "#bb4545",
  cancelled: "#667085"
};
const total = computed(() => props.items.reduce((sum, item) => sum + item.count, 0));
const rows = computed(() => props.items.map((item, index) => ({
  status: item.status ?? "unknown",
  label: repairStatusLabel(item.status ?? "unknown"),
  count: item.count,
  color: statusColors[item.status ?? ""] ?? palette[index % palette.length],
  percentage: total.value ? Math.round(item.count / total.value * 100) : 0
})));
const gradient = computed(() => {
  if (!total.value) return "conic-gradient(#d6dfda 0deg 360deg)";
  let angle = 0;
  const slices = rows.value.filter((row) => row.count > 0).map((row) => {
    const start = angle;
    angle += row.count / total.value * 360;
    return `${row.color} ${start}deg ${angle}deg`;
  });
  return `conic-gradient(from -90deg, ${slices.join(", ")})`;
});
</script>

<template>
  <div class="dashboard-donut-layout">
    <div class="dashboard-donut" :style="{ background: gradient }" role="img" :aria-label="`Distribución por estado: ${total} reparaciones`">
      <div class="dashboard-donut-center"><strong>{{ total }}</strong><span>Reparaciones</span></div>
    </div>
    <ul class="dashboard-donut-legend" aria-label="Reparaciones por estado">
      <li v-for="row in rows" :key="row.status" :style="{ '--status-color': row.color }">
        <span class="dashboard-donut-label"><i aria-hidden="true" />{{ row.label }}</span>
        <strong>{{ row.count }}</strong>
        <small>{{ row.percentage }}%</small>
      </li>
      <li v-if="!rows.length" class="dashboard-donut-empty">No hay reparaciones en este periodo.</li>
    </ul>
  </div>
</template>

<style scoped>
.dashboard-donut-layout { align-items: center; display: grid; gap: 20px; grid-template-columns: minmax(140px, .8fr) minmax(150px, 1fr); min-height: 194px; }
.dashboard-donut { align-items: center; aspect-ratio: 1; border-radius: 50%; display: flex; justify-content: center; margin: auto; max-width: 190px; position: relative; width: 100%; }
.dashboard-donut::before { background: #fff; border: 1px solid #e1e7e3; border-radius: 50%; content: ""; inset: 20%; position: absolute; }
.dashboard-donut-center { align-items: center; display: flex; flex-direction: column; position: relative; text-align: center; }
.dashboard-donut-center strong { color: #17252a; font-family: "DM Mono", monospace; font-size: 26px; }
.dashboard-donut-center span { color: #698078; font-size: 10px; }
.dashboard-donut-legend { display: grid; gap: 9px; list-style: none; margin: 0; max-height: 220px; overflow-y: auto; padding: 0 4px 0 0; }
.dashboard-donut-legend li { align-items: center; display: grid; gap: 7px; grid-template-columns: minmax(0, 1fr) auto 34px; }
.dashboard-donut-label { align-items: center; color: #49675a; display: flex; font-size: 11px; gap: 7px; min-width: 0; overflow-wrap: anywhere; }
.dashboard-donut-label i { background: var(--status-color); border-radius: 50%; flex: 0 0 9px; height: 9px; }
.dashboard-donut-legend strong { color: #17252a; font-family: "DM Mono", monospace; font-size: 11px; }
.dashboard-donut-legend small { color: #698078; font-size: 10px; text-align: right; }
.dashboard-donut-empty { color: #698078; font-size: 12px; grid-column: 1 / -1; }
@media (max-width: 1100px) { .dashboard-donut-layout { grid-template-columns: minmax(135px, .7fr) minmax(140px, 1fr); } }
@media (max-width: 720px) { .dashboard-donut-layout { grid-template-columns: minmax(130px, .8fr) minmax(130px, 1fr); } }
@media (max-width: 480px) { .dashboard-donut-layout { gap: 16px; grid-template-columns: minmax(0, 1fr); justify-items: center; }.dashboard-donut { max-width: 170px; }.dashboard-donut-legend { max-height: none; width: 100%; } }
</style>
