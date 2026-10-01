import { staffSession } from "../auth/session";
// Los estados activos los define la configuracion administrativa, no una lista
// fija en el cliente: `getWorkflowConfig()` es la fuente de verdad.
export type RepairStatus = string;
export interface RepairWorkflowConfig { statuses: string[]; deviceTypes: string[]; }
export interface Repair { id: string; customerId: string; deviceType: string; brand: string; model: string; serialNumber: string | null; reportedIssue: string; deliveredAccessories: string | null; technicianId: string | null; diagnosis: string | null; status: RepairStatus; createdAt: string; }
export interface RepairListOptions { q?: string; estado?: string; tecnico?: string; tipo?: string; cliente?: string; desde?: string; hasta?: string; orden?: "createdAt:asc" | "createdAt:desc" | "brand:asc" | "brand:desc"; pagina?: number; pageSize?: number; }
export interface RepairPage { items: Repair[]; total: number; page: number; pageSize: number; }
export interface Quote { id: string; repairOrderId: string; lines: { description: string; quantity: number; unitPriceCents: number }[]; totalCents: number; status: "draft" | "sent" | "approved" | "rejected"; }
export interface RepairStep { id: string; repairOrderId: string; sequence: number; title: string; description: string | null; technicianId: string; performedAt: string; createdAt: string; }
const headers = (): HeadersInit => ({ "content-type": "application/json", authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` });
async function request<T>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, { ...init, headers: { ...headers(), ...init?.headers } }); if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudo completar la operacion." }))).message); return response.json() as Promise<T>; }
export const listRepairs = (options: RepairListOptions = {}) => {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(options)) if (value !== undefined && value !== "") query.set(key, String(value));
	const suffix = query.size ? `?${query}` : "";
	return request<RepairPage>(`/api/repairs${suffix}`);
};
export const getRepair = (id: string) => request<Repair>(`/api/repairs/${id}`);
export const getWorkflowConfig = () => request<RepairWorkflowConfig>("/api/repairs/config"); export const listCustomers = () => request<{ items: { id: string; displayName: string }[] }>("/api/customers?pageSize=100&orden=displayName%3Aasc"); export const listTechnicians = () => request<{ id: string; displayName: string }[]>("/api/technicians");
export const createRepair = (input: Omit<Repair, "id" | "status" | "technicianId" | "diagnosis" | "createdAt" | "serialNumber" | "deliveredAccessories"> & { serialNumber?: string; deliveredAccessories?: string }) => request<Repair>("/api/repairs", { method: "POST", body: JSON.stringify(input) });
export const updateStatus = (id: string, status: RepairStatus) => request<Repair>(`/api/repairs/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); export const updateTechnical = (id: string, input: { technicianId?: string; diagnosis?: string }) => request<Repair>(`/api/repairs/${id}/technical`, { method: "PATCH", body: JSON.stringify(input) });
export const getQuote = (id: string) => request<Quote>(`/api/repairs/${id}/quote`); export const saveQuote = (id: string, input: Pick<Quote, "lines" | "status">) => request<Quote>(`/api/repairs/${id}/quote`, { method: "PATCH", body: JSON.stringify(input) }); export const getHistory = (id: string) => request<{ id: string; status: string; note: string | null; createdAt: string }[]>(`/api/repairs/${id}/history`);
export const listRepairSteps = (id: string) => request<RepairStep[]>(`/api/repairs/${id}/steps`);
export const addRepairStep = (id: string, input: { title: string; description?: string; performedAt?: string }) => request<RepairStep>(`/api/repairs/${id}/steps`, { method: "POST", body: JSON.stringify(input) });
export async function downloadTechnicalReport(id: string): Promise<Blob> { const response = await fetch(`/api/repairs/${id}/report`, { headers: { authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` } }); if (!response.ok) throw new Error("No se pudo descargar el informe técnico."); return response.blob(); }