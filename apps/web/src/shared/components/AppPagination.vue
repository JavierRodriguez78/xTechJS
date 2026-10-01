<script setup lang="ts">
const props = defineProps<{ page: number; pageSize: number; total: number }>();
const emit = defineEmits<{ change: [page: number]; pageSizeChange: [pageSize: number] }>();
const pageCount = () => Math.max(1, Math.ceil(props.total / props.pageSize));
</script>

<template>
  <nav v-if="total" class="app-pagination" aria-label="Paginación">
    <span>{{ total }} resultados</span>
    <label>Por página<select :value="pageSize" @change="emit('pageSizeChange', Number(($event.target as HTMLSelectElement).value))"><option :value="25">25</option><option :value="50">50</option><option :value="100">100</option></select></label>
    <button type="button" class="secondary" :disabled="page <= 1" @click="emit('change', page - 1)">Anterior</button>
    <span>Página {{ page }} de {{ pageCount() }}</span>
    <button type="button" class="secondary" :disabled="page >= pageCount()" @click="emit('change', page + 1)">Siguiente</button>
  </nav>
</template>