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

<style scoped>
.app-pagination {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.app-pagination label {
  align-items: center;
  display: inline-flex;
  gap: 4px;
}

.app-pagination select {
  background: #fff;
  border: 1px solid #b5c9bd;
  border-radius: 4px;
  font: inherit;
  padding: 4px;
}

.app-pagination button {
  padding: 8px 12px;
}

.app-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 560px) {
  .app-pagination {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>