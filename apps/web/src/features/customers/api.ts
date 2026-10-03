import { staffSession } from "../auth/session";

export interface Customer { id: string; displayName: string; email: string | null; phone: string | null; address: string | null; addressStreet?: string | null; addressPostalCode?: string | null; addressCity?: string | null; addressProvince?: string | null; addressCountry?: string | null; taxId: string | null; customerType?: "individual" | "business" | null; internalNotes: string | null; registrationStatus: "pending" | "completed"; billingName?: string | null; billingTaxId?: string | null; billingAddressStreet?: string | null; billingAddressPostalCode?: string | null; billingAddressCity?: string | null; billingAddressProvince?: string | null; billingAddressCountry?: string | null; tags: string[]; createdAt: string; }
export interface CustomerInput { displayName: string; email: string; phone?: string; addressStreet?: string; addressPostalCode?: string; addressCity?: string; addressProvince?: string; addressCountry?: string; taxId?: string; customerType?: "individual" | "business"; internalNotes?: string; billingName?: string; billingTaxId?: string; billingAddressStreet?: string; billingAddressPostalCode?: string; billingAddressCity?: string; billingAddressProvince?: string; billingAddressCountry?: string; useContactAddressForBilling?: boolean; tags?: string[]; }
export interface CustomerListOptions { q?: string; estado?: "pending" | "completed"; etiqueta?: string; desde?: string; hasta?: string; orden?: "displayName:asc" | "displayName:desc" | "createdAt:asc" | "createdAt:desc"; pagina?: number; pageSize?: number; }
export interface CustomerPage { items: Customer[]; total: number; page: number; pageSize: number; }
export interface CustomerCommunication { id: string; type: "registration_invitation" | "invoice_email" | "repair_notification"; recipient: string; status: "pending" | "sent" | "failed"; subject: string; reference: string | null; errorMessage: string | null; createdAt: string; }
const headers = (): HeadersInit => ({ "content-type": "application/json", authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` });
async function request<T>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, { ...init, headers: { ...headers(), ...init?.headers } }); if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudo completar la operacion." }))).message); return response.json() as Promise<T>; }
export const listCustomers = (options: CustomerListOptions = {}) => {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(options)) if (value !== undefined && value !== "") search.set(key, String(value));
	const suffix = search.size ? `?${search}` : "";
	return request<CustomerPage>(`/api/customers${suffix}`);
};
export const getCustomer = (id: string) => request<Customer>(`/api/customers/${id}`);
export const getCustomerRepairs = (id: string) => request<{ id: string; brand: string; model: string; deviceType: string; status: string; reportedIssue: string }[]>(`/api/customers/${id}/repairs`);
export const getCustomerCommunications = (id: string) => request<CustomerCommunication[]>(`/api/customers/${id}/communications`);
export const createCustomer = (input: CustomerInput) => request<Customer>("/api/customers", { method: "POST", body: JSON.stringify(input) });
export const updateCustomer = (id: string, input: CustomerInput) => request<Customer>(`/api/customers/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const resendInvitation = (id: string) => request<{ message: string }>(`/api/customers/${id}/resend-invitation`, { method: "POST" });