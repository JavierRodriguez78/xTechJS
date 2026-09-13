import { staffSession } from "../auth/session";

export interface Customer { id: string; displayName: string; email: string | null; phone: string | null; address: string | null; taxId: string | null; internalNotes: string | null; registrationStatus: "pending" | "completed"; billingName?: string | null; billingTaxId?: string | null; billingAddress?: string | null; billingPostalCode?: string | null; billingCity?: string | null; billingProvince?: string | null; tags: string[]; createdAt: string; }
export interface CustomerInput { displayName: string; email: string; phone?: string; address?: string; taxId?: string; internalNotes?: string; tags?: string[]; }
const headers = (): HeadersInit => ({ "content-type": "application/json", authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` });
async function request<T>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, { ...init, headers: { ...headers(), ...init?.headers } }); if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudo completar la operacion." }))).message); return response.json() as Promise<T>; }
export const listCustomers = () => request<Customer[]>("/api/customers");
export const getCustomer = (id: string) => request<Customer>(`/api/customers/${id}`);
export const getCustomerRepairs = (id: string) => request<{ id: string; brand: string; model: string; deviceType: string; status: string; reportedIssue: string }[]>(`/api/customers/${id}/repairs`);
export const createCustomer = (input: CustomerInput) => request<Customer>("/api/customers", { method: "POST", body: JSON.stringify(input) });
export const updateCustomer = (id: string, input: CustomerInput) => request<Customer>(`/api/customers/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const resendInvitation = (id: string) => request<{ message: string }>(`/api/customers/${id}/resend-invitation`, { method: "POST" });