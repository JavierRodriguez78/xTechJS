export type AttachmentMode = "staff" | "customer";

export interface RepairAttachmentRecord {
  id: string;
  repairOrderId: string;
  uploaderId: string;
  uploaderRole: "admin" | "technician";
  fileName: string;
  mimeType: string;
  sizeBytes: number | string;
  createdAt: string;
}

function basePath(mode: AttachmentMode, repairId: string): string {
  return mode === "customer" ? `/api/customer/repairs/${repairId}/attachments` : `/api/repairs/${repairId}/attachments`;
}

export async function listAttachments(mode: AttachmentMode, repairId: string, token: string): Promise<RepairAttachmentRecord[]> {
  const response = await fetch(basePath(mode, repairId), { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("No se pudieron cargar los adjuntos.");
  return response.json() as Promise<RepairAttachmentRecord[]>;
}

export async function uploadAttachment(repairId: string, token: string, file: File): Promise<RepairAttachmentRecord> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`/api/repairs/${repairId}/attachments`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: formData });
  if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudo subir el archivo." }))).message);
  return response.json() as Promise<RepairAttachmentRecord>;
}

export async function deleteAttachment(repairId: string, token: string, attachmentId: string): Promise<void> {
  const response = await fetch(`/api/repairs/${repairId}/attachments/${attachmentId}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
  if (!response.ok && response.status !== 204) throw new Error("No se pudo eliminar el adjunto.");
}

// Downloads require an authenticated fetch + Blob: a plain <img src> or window.open would drop the Authorization header.
export async function fetchAttachmentBlobUrl(mode: AttachmentMode, repairId: string, token: string, attachmentId: string): Promise<string> {
  const response = await fetch(`${basePath(mode, repairId)}/${attachmentId}`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("No se pudo descargar el adjunto.");
  return URL.createObjectURL(await response.blob());
}
