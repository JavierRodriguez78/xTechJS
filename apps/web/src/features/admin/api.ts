import { staffSession } from "../auth/session";

export interface AdminUser { id: string; email: string; displayName: string; role: "admin" | "technician" | "customer"; active: boolean; }
export interface AuditLogEntry { id: string; action: string; createdAt: string; actorName: string | null; actorEmail: string | null; targetName: string | null; targetEmail: string | null; }
export interface NotificationTemplate { key: string; subject: string; body: string; enabled: boolean; updatedAt: string; }
const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, { ...init, headers: { authorization: `Bearer ${staffSession.value?.accessToken ?? ""}`, ...init?.headers } });
  // El servidor explica por que rechaza la operacion (estado protegido, plantilla
  // no valida); perder ese mensaje deja al administrador sin saber que corregir.
  if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudieron cargar los datos." }))).message ?? "No se pudieron cargar los datos.");
  return response.json() as Promise<T>;
};
export const listUsers = () => request<AdminUser[]>("/api/users");
export const listAuditLogs = () => request<AuditLogEntry[]>("/api/users/audit");
export const listRepairStatuses = () => request<{ values: string[] }>("/api/admin/config/repair-statuses");
export const listDeviceTypes = () => request<{ values: string[] }>("/api/admin/config/device-types");
export const addConfigValue = (kind: "repair-statuses" | "device-types", value: string) => request<{ values: string[] }>(`/api/admin/config/${kind}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value }) });
export const removeConfigValue = (kind: "repair-statuses" | "device-types", value: string) => request<{ values: string[] }>(`/api/admin/config/${kind}/remove`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value }) });
export const listNotificationTemplates = () => request<{ templates: NotificationTemplate[]; placeholders: string[] }>("/api/admin/config/notification-templates");
export const saveNotificationTemplate = (input: { key: string; subject: string; body: string; enabled: boolean }) => request<NotificationTemplate>("/api/admin/config/notification-templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
export const removeNotificationTemplate = (key: string) => request<{ key: string }>("/api/admin/config/notification-templates/remove", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
export const createUser = (input: { email: string; displayName: string; role: AdminUser["role"]; password: string }) => request<AdminUser>("/api/users", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` }, body: JSON.stringify(input) });
export const updateUser = (id: string, input: { email?: string; displayName?: string; role?: AdminUser["role"]; active?: boolean; password?: string }) => request<AdminUser>(`/api/users/${id}`, { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` }, body: JSON.stringify(input) });

export async function impersonateUser(id: string): Promise<{ accessToken: string; user: AdminUser }> {
  const response = await fetch(`/api/auth/impersonate/${id}`, { method: "POST", headers: { authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` } });
  if (!response.ok) throw new Error("No se pudo iniciar la suplantacion.");
  return response.json() as Promise<{ accessToken: string; user: AdminUser }>;
}