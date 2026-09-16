export type ChatMode = "staff" | "customer";

export interface ChatMessage {
  id: string;
  repairOrderId: string;
  senderId: string;
  senderRole: "admin" | "technician" | "customer";
  senderName: string;
  body: string;
  createdAt: string;
}

function basePath(mode: ChatMode, repairId: string): string {
  return mode === "customer" ? `/api/customer/repairs/${repairId}/messages` : `/api/repairs/${repairId}/messages`;
}

async function request<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...init?.headers } });
  if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudieron cargar los mensajes." }))).message);
  return response.json() as Promise<T>;
}

export const listMessages = (mode: ChatMode, repairId: string, token: string) => request<ChatMessage[]>(basePath(mode, repairId), token);

export const sendMessage = (mode: ChatMode, repairId: string, token: string, body: string) =>
  request<ChatMessage>(basePath(mode, repairId), token, { method: "POST", body: JSON.stringify({ body }) });
