<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { staffSession } from "../../auth/session";
import { getReceipt, sendInvoice } from "../api";

const route = useRoute();
const receipt = ref<Awaited<ReturnType<typeof getReceipt>> | null>(null);
const error = ref("");
const downloading = ref(false);
const sending = ref(false);
const message = ref("");
const money = (value: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value / 100);

async function download(): Promise<void> {
	downloading.value = true;
	error.value = "";
	try {
		const response = await fetch(`/api/payments/${route.params.id}/pdf`, {
			headers: { authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` }
		});
		if (!response.ok) {
			throw new Error("No se pudo descargar el recibo.");
		}
		const blobUrl = URL.createObjectURL(await response.blob());
		const anchor = document.createElement("a");
		anchor.href = blobUrl;
		anchor.download = `receipt-${String(route.params.id).slice(0, 8)}.pdf`;
		anchor.click();
		URL.revokeObjectURL(blobUrl);
	} catch (reason) {
		error.value = (reason as Error).message;
	} finally {
		downloading.value = false;
	}
}

async function send(): Promise<void> {
	sending.value = true;
	error.value = "";
	message.value = "";
	try {
		await sendInvoice(String(route.params.id));
		message.value = "Factura enviada al cliente.";
	} catch (reason) {
		error.value = (reason as Error).message;
	} finally {
		sending.value = false;
	}
}

onMounted(async () => {
	receipt.value = await getReceipt(String(route.params.id));
});
</script>

<template>
	<section v-if="receipt" class="customer-detail">
		<p class="breadcrumb"><RouterLink :to="{ name: 'payments.list' }">TPV</RouterLink> / Factura</p>
		<header>
			<div>
				<p class="eyebrow">Factura</p>
				<h1>{{ money(receipt.payment.amountCents) }}</h1>
				<span class="status-pill">{{ receipt.payment.status }}</span>
			</div>
			<div class="form-actions"><button :disabled="downloading" @click="download">{{ downloading ? "Descargando" : "Descargar PDF" }}</button><button class="secondary" :disabled="sending" @click="send">{{ sending ? "Enviando" : "Enviar por email" }}</button></div>
		</header>
		<p v-if="error" class="feedback error">{{ error }}</p>
		<p v-if="message" class="feedback success">{{ message }}</p>
		<section class="detail-tab">
			<dl>
				<dt>Cliente</dt><dd>{{ receipt.customer.displayName }}</dd>
				<dt>Reparacion</dt><dd>{{ receipt.repair.brand }} {{ receipt.repair.model }}</dd>
				<dt>Metodo</dt><dd>{{ receipt.payment.method }}</dd>
				<dt>Referencia</dt><dd>{{ receipt.payment.reference || "Sin referencia" }}</dd>
			</dl>
		</section>
	</section>
	<p v-else class="empty">Cargando recibo...</p>
</template>