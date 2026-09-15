import { staffSession } from "../auth/session";

export interface AdminUser { id: string; email: string; displayName: string; role: "admin" | "technician" | "customer"; active: boolean; }
export interface AuditLogEntry { id: string; action: string; createdAt: string; actorName: string | null; actorEmail: string | null; targetName: string | null; targetEmail: string | null; }
const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, { ...init, headers: { authorization: `Bearer ${staffSession.value?.accessToken ?? ""}`, ...init?.headers } });
  if (!response.ok) throw new Error("No se pudieron cargar los datos.");
  return response.json() as Promise<T>;
};
export const listUsers = () => request<AdminUser[]>("/api/users");
export const listAuditLogs = () => request<AuditLogEntry[]>("/api/users/audit");
export const listRepairStatuses = () => request<{ values: string[] }>("/api/admin/config/repair-statuses");
export const listDeviceTypes = () => request<{ values: string[] }>("/api/admin/config/device-types");
export const createUser = (input: { email: string; displayName: string; role: AdminUser["role"]; password: string }) => request<AdminUser>("/api/users", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` }, body: JSON.stringify(input) });
export const updateUser = (id: string, input: { email?: string; displayName?: string; role?: AdminUser["role"]; active?: boolean; password?: string }) => request<AdminUser>(`/api/users/${id}`, { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` }, body: JSON.stringify(input) });

export async function impersonateUser(id: string): Promise<{ accessToken: string; user: AdminUser }> {
  const response = await fetch(`/api/auth/impersonate/${id}`, { method: "POST", headers: { authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` } });
  if (!response.ok) throw new Error("No se pudo iniciar la suplantacion.");
  return response.json() as Promise<{ accessToken: string; user: AdminUser }>;
}