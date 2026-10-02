<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { customerSession } from "../../customer-portal/session";
import { decideCustomerTradeInRequest, getCustomerTradeInRequest, listCustomerTradeInAttachments, submitCustomerTradeInRequest, uploadCustomerTradeInAttachment, type ShopAttachment, type TradeInRequest, type TradeInStatus } from "../api";

const route = useRoute();
const request = ref<TradeInRequest | null>(null);
const attachments = ref<ShopAttachment[]>([]);
const error = ref("");
const submitting = ref(false);
const uploading = ref(false);
const statusLabels: Record<TradeInStatus, string> = { draft: "Borrador", submitted: "Enviada", in_review: "En revisión", proposal_sent: "Propuesta recibida", accepted: "Aceptada", rejected: "Rechazada", completed: "Completada", cancelled: "Cancelada" };
const money = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
const canSubmit = computed(() => request.value?.status === "draft" && attachments.value.some((attachment) => attachment.mimeType.startsWith("image/")));
async function load(): Promise<void> { if (!customerSession.value) return; error.value = ""; try { const id = String(route.params.id); const [loadedRequest, loadedAttachments] = await Promise.all([getCustomerTradeInRequest(customerSession.value.accessToken, id), listCustomerTradeInAttachments(customerSession.value.accessToken, id)]); request.value = loadedRequest; attachments.value = loadedAttachments; } catch (reason) { error.value = (reason as Error).message; } }
async function upload(event: Event): Promise<void> { const file = (event.target as HTMLInputElement).files?.[0]; if (!file || !customerSession.value) return; uploading.value = true; error.value = ""; try { attachments.value.push(await uploadCustomerTradeInAttachment(customerSession.value.accessToken, String(route.params.id), file)); } catch (reason) { error.value = (reason as Error).message; } finally { uploading.value = false; (event.target as HTMLInputElement).value = ""; } }
async function submit(): Promise<void> { if (!customerSession.value) return; submitting.value = true; error.value = ""; try { request.value = await submitCustomerTradeInRequest(customerSession.value.accessToken, String(route.params.id)); } catch (reason) { error.value = (reason as Error).message; } finally { submitting.value = false; } }
async function decide(decision: "accept" | "reject"): Promise<void> { if (!customerSession.value) return; submitting.value = true; error.value = ""; try { request.value = await decideCustomerTradeInRequest(customerSession.value.accessToken, String(route.params.id), decision); } catch (reason) { error.value = (reason as Error).message; } finally { submitting.value = false; } }
onMounted(load);
</script>

<template>
  <main class="customer-orders-page"><p class="shop-back"><RouterLink :to="{ name: 'customer.trade-in.list' }">Volver a mis solicitudes</RouterLink></p><p v-if="!request && !error" class="empty">Cargando solicitud...</p><p v-else-if="error && !request" class="feedback error">{{ error }}</p>
    <section v-else-if="request" class="customer-order-detail"><header><div><p class="eyebrow">Compraventa</p><h1>{{ request.brand }} {{ request.model }}</h1><p>{{ statusLabels[request.status] }}</p></div><span :class="['status-pill', request.status]">{{ statusLabels[request.status] }}</span></header><div class="customer-order-detail-grid"><section><h2>Equipo</h2><p><strong>Tipo:</strong> {{ request.deviceType }}</p><p><strong>Estado:</strong> {{ request.conditionDescription }}</p></section><section v-if="request.proposedAmountCents !== null"><h2>Propuesta</h2><strong class="trade-in-amount">{{ money(request.proposedAmountCents) }}</strong><p v-if="request.proposalNote">{{ request.proposalNote }}</p><div v-if="request.status === 'proposal_sent'" class="trade-in-actions"><button :disabled="submitting" type="button" @click="decide('accept')">Aceptar propuesta</button><button :disabled="submitting" class="secondary" type="button" @click="decide('reject')">Rechazar</button></div></section><section v-else><h2>Valoración</h2><p class="empty">El laboratorio revisará tu solicitud y te enviará una propuesta.</p></section></div>
      <section v-if="request.status === 'draft'" class="customer-order-detail trade-in-attachments"><h2>Fotos y documentación</h2><p>Incluye al menos una foto antes de enviar la solicitud.</p><label class="attachments-upload">{{ uploading ? "Subiendo archivo" : "Añadir archivo" }}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,application/pdf" :disabled="uploading" @change="upload" /></label><ul v-if="attachments.length" class="ecommerce-attachment-list"><li v-for="attachment in attachments" :key="attachment.id">{{ attachment.fileName }} <span>{{ attachment.mimeType }}</span></li></ul><p v-else class="empty">Todavía no has añadido archivos.</p><button :disabled="submitting || !canSubmit" type="button" @click="submit">{{ submitting ? "Enviando" : "Enviar para valoración" }}</button><p v-if="!canSubmit" class="empty">Añade una imagen para poder enviar la solicitud.</p></section><p v-else-if="attachments.length" class="empty">{{ attachments.length }} archivo(s) adjunto(s).</p><p v-if="error" class="feedback error">{{ error }}</p></section>
  </main>
</template>
