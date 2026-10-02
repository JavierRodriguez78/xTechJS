<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppPagination from "../../../shared/components/AppPagination.vue";
import { listManagedShopOrders, updateManagedShopOrderStatus, type ShopOrder, type ShopOrderPage } from "../api";

const route = useRoute();
const router = useRouter();
const result = ref<ShopOrderPage>({ items: [], total: 0, page: 1, pageSize: 25 });
const loading = ref(true);
const error = ref("");
const status = ref<ShopOrder["status"] | "">("");
const updatingId = ref("");
const statuses: { value: ShopOrder["status"]; label: string }[] = [{ value: "pending_payment", label: "Pendiente de pago" }, { value: "paid", label: "Pagado" }, { value: "preparing", label: "En preparación" }, { value: "shipped", label: "Enviado" }, { value: "delivered", label: "Entregado" }, { value: "cancelled", label: "Cancelado" }, { value: "refunded", label: "Reembolsado" }];
const nextStatuses: Partial<Record<ShopOrder["status"], ShopOrder["status"][]>> = { pending_payment: ["paid", "cancelled"], paid: ["preparing", "refunded"], preparing: ["shipped", "cancelled"], shipped: ["delivered", "refunded"] };
const money = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
const label = (value: ShopOrder["status"]) => statuses.find((item) => item.value === value)?.label ?? value;
const hasStatusFilter = computed(() => Boolean(status.value));

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    result.value = await listManagedShopOrders({ status: status.value || undefined, pagina: Number(route.query.pagina ?? 1), pageSize: 25 });
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    loading.value = false;
  }
}

function replaceQuery(page = 1): void {
  void router.replace({ query: { status: status.value || undefined, pagina: page === 1 ? undefined : String(page) } });
}

async function changeStatus(order: ShopOrder, next: ShopOrder["status"]): Promise<void> {
  updatingId.value = order.id;
  error.value = "";
  try {
    await updateManagedShopOrderStatus(order.id, next);
    await load();
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    updatingId.value = "";
  }
}

watch(() => route.query, (next) => { status.value = String(next.status ?? "") as ShopOrder["status"] | ""; void load(); }, { immediate: true });
watch(status, () => replaceQuery());
</script>

<template>
  <section class="ecommerce-orders-view"><header><div><p class="eyebrow">Ecommerce</p><h1>Pedidos <span class="count">{{ result.total }}</span></h1></div></header><div class="filter-bar"><select v-model="status"><option value="">Todos los estados</option><option v-for="item in statuses" :key="item.value" :value="item.value">{{ item.label }}</option></select><button v-if="hasStatusFilter" class="secondary" type="button" @click="status = ''">Limpiar filtro</button></div>
    <p v-if="error" class="feedback error">{{ error }} <button class="secondary" type="button" @click="load">Reintentar</button></p><div v-else class="customer-list"><div v-if="loading" v-for="item in 6" :key="item" class="skeleton-row" /><p v-else-if="!result.total" class="empty">No hay pedidos con este estado.</p><article v-else v-for="order in result.items" :key="order.id" class="ecommerce-order-row"><div><p class="eyebrow">Pedido {{ order.id.slice(0, 8) }}</p><strong>{{ order.lines.map((line) => line.titleSnapshot).join(", ") }}</strong><span>{{ new Date(order.createdAt).toLocaleDateString("es-ES") }} · {{ order.shippingAddress.city }}</span></div><strong>{{ money(order.totalCents) }}</strong><span :class="['status-pill', order.status]">{{ label(order.status) }}</span><select v-if="nextStatuses[order.status]?.length" :value="''" :disabled="updatingId === order.id" @change="changeStatus(order, ($event.target as HTMLSelectElement).value as ShopOrder['status'])"><option value="" disabled>{{ updatingId === order.id ? "Actualizando" : "Cambiar estado" }}</option><option v-for="next in nextStatuses[order.status]" :key="next" :value="next">{{ label(next) }}</option></select></article></div><AppPagination :page="result.page" :page-size="result.pageSize" :total="result.total" @change="replaceQuery" />
  </section>
</template>
