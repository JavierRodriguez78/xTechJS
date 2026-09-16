<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { deleteAttachment, fetchAttachmentBlobUrl, listAttachments, uploadAttachment, type AttachmentMode, type RepairAttachmentRecord } from "./api";

const props = defineProps<{ repairId: string; token: string; mode: AttachmentMode; canManage: boolean }>();

const attachments = ref<RepairAttachmentRecord[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const uploading = ref(false);
const fileInput = ref<HTMLInputElement>();
const objectUrls: string[] = [];

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function formatSize(sizeBytes: number | string): string {
  const bytes = Number(sizeBytes);
  return bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

async function load(): Promise<void> {
  loading.value = true;
  errorMessage.value = "";
  try {
    attachments.value = await listAttachments(props.mode, props.repairId, props.token);
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    loading.value = false;
  }
}

async function view(attachment: RepairAttachmentRecord): Promise<void> {
  try {
    const url = await fetchAttachmentBlobUrl(props.mode, props.repairId, props.token, attachment.id);
    objectUrls.push(url);
    window.open(url, "_blank", "noopener");
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  uploading.value = true;
  errorMessage.value = "";
  try {
    const attachment = await uploadAttachment(props.repairId, props.token, file);
    attachments.value = [attachment, ...attachments.value];
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}

async function remove(attachment: RepairAttachmentRecord): Promise<void> {
  try {
    await deleteAttachment(props.repairId, props.token, attachment.id);
    attachments.value = attachments.value.filter((item) => item.id !== attachment.id);
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

onMounted(load);
onBeforeUnmount(() => objectUrls.forEach((url) => URL.revokeObjectURL(url)));
</script>

<template>
  <section class="attachments-panel">
    <label v-if="canManage" class="attachments-upload">
      <input ref="fileInput" type="file" accept="image/*,video/mp4,video/quicktime,video/webm" :disabled="uploading" @change="onFileSelected" />
      <span>{{ uploading ? "Subiendo..." : "Subir foto o vídeo" }}</span>
    </label>

    <p v-if="errorMessage" class="feedback error">{{ errorMessage }}</p>
    <p v-if="loading" class="empty">Cargando adjuntos...</p>

    <ul v-else class="attachments-grid">
      <li v-for="attachment in attachments" :key="attachment.id" class="attachment-card">
        <button type="button" class="attachment-preview" :class="{ video: !isImage(attachment.mimeType) }" @click="view(attachment)">
          {{ isImage(attachment.mimeType) ? "🖼️" : "🎬" }}
        </button>
        <p class="attachment-name">{{ attachment.fileName }}</p>
        <p class="attachment-meta">{{ formatSize(attachment.sizeBytes) }} · {{ new Date(attachment.createdAt).toLocaleDateString("es-ES") }}</p>
        <button v-if="canManage" type="button" class="secondary" @click="remove(attachment)">Eliminar</button>
      </li>
      <li v-if="!attachments.length" class="empty">No hay fotos ni vídeos todavía.</li>
    </ul>
  </section>
</template>
