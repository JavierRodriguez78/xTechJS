<script setup lang="ts">
import { onMounted, ref } from "vue";

interface InventoryItem { id: string; sku: string; name: string; unit: string; stock: number; minimumStock: number; }
interface Supplier { id: string; name: string; email: string | null; phone: string | null; }
interface PurchaseOrder { id: string; supplierId: string; status: string; lines: { inventoryItemId: string; quantity: number; unitCostCents: number }[]; }
interface Repair { id: string; brand: string; model: string; }
const props = defineProps<{ accessToken: string }>();
const items = ref<InventoryItem[]>([]); const lowStock = ref<InventoryItem[]>([]); const suppliers = ref<Supplier[]>([]); const orders = ref<PurchaseOrder[]>([]); const repairs = ref<Repair[]>([]);
const loading = ref(false); const errorMessage = ref(""); const successMessage = ref("");
const itemForm = ref({ sku: "", name: "", minimumStock: 0 }); const supplierForm = ref({ name: "", email: "", phone: "" });
const adjustment = ref<Record<string, number>>({}); const consumption = ref({ itemId: "", repairOrderId: "", quantity: 1 });
const orderForm = ref({ supplierId: "", itemId: "", quantity: 1, unitCostCents: 0 });
function headers(json = false): HeadersInit { return json ? { "content-type": "application/json", authorization: `Bearer ${props.accessToken}` } : { authorization: `Bearer ${props.accessToken}` }; }
async function request(url: string, options: RequestInit = {}): Promise<Response> { return fetch(url, { ...options, headers: { ...headers(Boolean(options.body)), ...(options.headers ?? {}) } }); }
async function load(): Promise<void> {
  loading.value = true; errorMessage.value = "";
  try {
    const responses = await Promise.all([request("/api/inventory"), request("/api/inventory/alerts/low-stock"), request("/api/inventory/suppliers"), request("/api/inventory/purchase-orders"), request("/api/repairs")]);
    if (responses.some((response) => !response.ok)) throw new Error("No se pudo cargar el almacén.");
    [items.value, lowStock.value, suppliers.value, orders.value, repairs.value] = await Promise.all(responses.map((response) => response.json()));
  } catch (error) { errorMessage.value = (error as Error).message; } finally { loading.value = false; }
}
async function createItem(): Promise<void> { const response = await request("/api/inventory", { method: "POST", body: JSON.stringify({ ...itemForm.value }) }); if (!response.ok) { errorMessage.value = "No se pudo crear el material."; return; } itemForm.value = { sku: "", name: "", minimumStock: 0 }; successMessage.value = "Material creado."; await load(); }
async function adjustStock(item: InventoryItem, quantity: number): Promise<void> { if (!quantity) return; const response = await request(`/api/inventory/${item.id}/stock`, { method: "PATCH", body: JSON.stringify({ quantity, type: "adjustment", note: "Ajuste desde consola" }) }); if (!response.ok) { errorMessage.value = "No se pudo ajustar el stock."; return; } successMessage.value = "Stock actualizado."; adjustment.value[item.id] = 0; await load(); }
async function consumeStock(): Promise<void> { const response = await request(`/api/inventory/${consumption.value.itemId}/consume`, { method: "POST", body: JSON.stringify({ repairOrderId: consumption.value.repairOrderId, quantity: consumption.value.quantity, note: "Consumo desde consola" }) }); if (!response.ok) { errorMessage.value = "No se pudo registrar el consumo."; return; } successMessage.value = "Consumo registrado."; await load(); }
async function createSupplier(): Promise<void> { const response = await request("/api/inventory/suppliers", { method: "POST", body: JSON.stringify(supplierForm.value) }); if (!response.ok) { errorMessage.value = "No se pudo crear el proveedor."; return; } supplierForm.value = { name: "", email: "", phone: "" }; successMessage.value = "Proveedor creado."; await load(); }
async function createOrder(): Promise<void> { const response = await request("/api/inventory/purchase-orders", { method: "POST", body: JSON.stringify({ supplierId: orderForm.value.supplierId, lines: [{ inventoryItemId: orderForm.value.itemId, quantity: orderForm.value.quantity, unitCostCents: orderForm.value.unitCostCents }] }) }); if (!response.ok) { errorMessage.value = "No se pudo crear la orden de compra."; return; } successMessage.value = "Orden de compra creada."; await load(); }
async function receiveOrder(order: PurchaseOrder): Promise<void> { const response = await request(`/api/inventory/purchase-orders/${order.id}/receive`, { method: "POST" }); if (!response.ok) { errorMessage.value = "No se pudo recibir la orden."; return; } successMessage.value = "Orden recibida y stock actualizado."; await load(); }
onMounted(load);
</script>

<template>
  <section class="operations-view content">
    <header><div><p class="eyebrow">Operaciones</p><h1>Almacén</h1></div><button type="button" :disabled="loading" @click="load">Actualizar</button></header>
    <p v-if="errorMessage" class="feedback error">{{ errorMessage }}</p><p v-if="successMessage" class="feedback success">{{ successMessage }}</p>
    <div class="operations-grid">
      <section class="operation-panel"><div class="section-heading"><div><p class="eyebrow">Stock</p><h2>Materiales</h2></div><span class="count">{{ items.length }}</span></div><p v-if="!items.length" class="empty">No hay materiales.</p><ul class="operation-list"><li v-for="item in items" :key="item.id"><div><strong>{{ item.name }}</strong><span>{{ item.sku }} · {{ item.stock }} {{ item.unit }} · mínimo {{ item.minimumStock }}</span></div><div class="inline-actions"><input v-model.number="adjustment[item.id]" type="number" placeholder="+/-" /><button type="button" @click="adjustStock(item, adjustment[item.id] || 0)">Ajustar</button></div></li></ul></section>
      <form class="operation-panel operation-form" @submit.prevent="createItem"><p class="eyebrow">Catálogo</p><h2>Nuevo material</h2><label><span>SKU</span><input v-model="itemForm.sku" required /></label><label><span>Nombre</span><input v-model="itemForm.name" required /></label><label><span>Stock mínimo</span><input v-model.number="itemForm.minimumStock" min="0" type="number" /></label><button type="submit">Crear material</button></form>
      <section class="operation-panel"><div class="section-heading"><div><p class="eyebrow">Alertas</p><h2>Stock bajo</h2></div><span class="count">{{ lowStock.length }}</span></div><p v-if="!lowStock.length" class="empty">Sin alertas.</p><ul class="operation-list"><li v-for="item in lowStock" :key="item.id"><strong>{{ item.name }}</strong><span>{{ item.stock }} disponibles · mínimo {{ item.minimumStock }}</span></li></ul></section>
      <form class="operation-panel operation-form" @submit.prevent="consumeStock"><p class="eyebrow">Reparaciones</p><h2>Registrar consumo</h2><label><span>Material</span><select v-model="consumption.itemId" required><option disabled value="">Selecciona material</option><option v-for="item in items" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label><span>Reparación</span><select v-model="consumption.repairOrderId" required><option disabled value="">Selecciona orden</option><option v-for="repair in repairs" :key="repair.id" :value="repair.id">{{ repair.brand }} {{ repair.model }}</option></select></label><label><span>Cantidad</span><input v-model.number="consumption.quantity" min="1" type="number" /></label><button type="submit">Registrar consumo</button></form>
      <form class="operation-panel operation-form" @submit.prevent="createSupplier"><p class="eyebrow">Proveedores</p><h2>Nuevo proveedor</h2><label><span>Nombre</span><input v-model="supplierForm.name" required /></label><label><span>Email</span><input v-model="supplierForm.email" type="email" /></label><label><span>Teléfono</span><input v-model="supplierForm.phone" /></label><button type="submit">Crear proveedor</button></form>
      <form class="operation-panel operation-form" @submit.prevent="createOrder"><p class="eyebrow">Compras</p><h2>Nueva orden</h2><label><span>Proveedor</span><select v-model="orderForm.supplierId" required><option disabled value="">Selecciona proveedor</option><option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option></select></label><label><span>Material</span><select v-model="orderForm.itemId" required><option disabled value="">Selecciona material</option><option v-for="item in items" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label><span>Cantidad</span><input v-model.number="orderForm.quantity" min="1" type="number" /></label><label><span>Coste unitario (céntimos)</span><input v-model.number="orderForm.unitCostCents" min="0" type="number" /></label><button type="submit">Crear orden</button></form>
    </div>
    <section class="operation-panel purchase-orders"><div class="section-heading"><div><p class="eyebrow">Recepción</p><h2>Órdenes de compra</h2></div><span class="count">{{ orders.length }}</span></div><ul class="operation-list"><li v-for="order in orders" :key="order.id"><div><strong>{{ order.id.slice(0, 8) }}</strong><span>{{ order.status }} · {{ order.lines.length }} líneas</span></div><button v-if="order.status !== 'received'" type="button" @click="receiveOrder(order)">Recibir</button></li></ul></section>
  </section>
</template>
