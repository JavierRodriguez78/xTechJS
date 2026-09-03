<script setup lang="ts">
const repairSummary = [
  { label: "En diagnostico", value: 12, tone: "amber" },
  { label: "En reparacion", value: 8, tone: "blue" },
  { label: "Listos para entrega", value: 5, tone: "green" }
];

const recentRepairs = [
  { code: "R-2026-041", device: "PlayStation 5", customer: "Marta Ruiz", status: "En diagnostico" },
  { code: "R-2026-040", device: "iPhone 14 Pro", customer: "Daniel Vega", status: "En reparacion" },
  { code: "R-2026-039", device: "Nintendo Switch OLED", customer: "Lucia Martin", status: "En pruebas" }
];
</script>

<template>
  <main class="workspace">
    <aside class="sidebar">
      <a class="brand" href="#">xTech<span>JS</span></a>
      <nav aria-label="Navegacion principal">
        <a class="active" href="#">Panel</a>
        <a href="#">Reparaciones</a>
        <a href="#">Clientes</a>
        <a href="#">Almacen</a>
        <a href="#">TPV</a>
        <a href="#">Mensajes</a>
      </nav>
      <div class="profile">
        <strong>Admin Taller</strong>
        <span>Administracion</span>
      </div>
    </aside>

    <section class="content">
      <header>
        <div>
          <p class="eyebrow">Operacion diaria</p>
          <h1>El taller, a la vista.</h1>
        </div>
        <button type="button">Nueva reparacion</button>
      </header>

      <section class="metrics" aria-label="Resumen de reparaciones">
        <article v-for="item in repairSummary" :key="item.label" :class="['metric', item.tone]">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </section>

      <section class="repairs">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Actividad reciente</p>
            <h2>Ordenes en curso</h2>
          </div>
          <a href="#">Ver todas</a>
        </div>
        <div class="table" role="table">
          <div class="row table-head" role="row">
            <span>Orden</span><span>Equipo</span><span>Cliente</span><span>Estado</span>
          </div>
          <div v-for="repair in recentRepairs" :key="repair.code" class="row" role="row">
            <strong>{{ repair.code }}</strong><span>{{ repair.device }}</span><span>{{ repair.customer }}</span><span class="status">{{ repair.status }}</span>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>