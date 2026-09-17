import { staffSession } from "../auth/session";
export interface InvoiceLine { code?: string; concept: string; quantity: number; unitPriceCents: number; discountPercent: number; taxRate: number; }
export interface Payment { id: string; repairOrderId: string; amountCents: number; method: "cash" | "card" | "transfer"; status: "paid" | "refunded"; reference: string | null; invoiceLines?: InvoiceLine[]; documentType?: "invoice" | "rectification"; originalPaymentId?: string | null; rectificationReason?: string | null; createdAt: string; }
export interface CashRegister { id: string; businessDate: string; status: "open" | "closed"; paidCents: number; refundedCents: number; netCents: number; }
const headers = (withJsonBody: boolean): HeadersInit => ({ ...(withJsonBody ? { "content-type": "application/json" } : {}), authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` });
async function request<T>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, { ...init, headers: { ...headers(init?.body !== undefined), ...init?.headers } }); if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudo completar la operacion." }))).message); return response.json() as Promise<T>; }
export const listPayments = () => request<Payment[]>("/api/payments");
export const listRepairs = () => request<{ id: string; brand: string; model: string }[]>("/api/repairs");
export const createPayment = (input: { repairOrderId: string; amountCents: number; method: Payment["method"]; reference?: string; invoiceLines?: InvoiceLine[] }) => request<Payment>("/api/payments", { method: "POST", body: JSON.stringify(input) });
export const refundPayment = (id: string, reason: string) => request<Payment>(`/api/payments/${id}/refund`, { method: "POST", body: JSON.stringify({ reason }) });
export const getReceipt = (id: string) => request<{ payment: Payment; repair: { brand: string; model: string }; customer: { displayName: string } }>(`/api/payments/${id}/receipt`);
export const getCashRegister = (date: string) => request<CashRegister>(`/api/payments/cash-register/${date}`);
export const openCashRegister = (date: string) => request<CashRegister>(`/api/payments/cash-register/${date}/open`, { method: "POST" });
export const closeCashRegister = (date: string) => request<CashRegister>(`/api/payments/cash-register/${date}/close`, { method: "POST" });
export const getReport = (from: string, to: string) => request<{ paidCents: number; refundedCents: number; netCents: number; byDay: unknown[] }>(`/api/payments/report/${from}/${to}`);
export const sendInvoice = (id: string) => request<{ recipient: string; status: "sent" }>(`/api/payments/${id}/send-invoice`, { method: "POST" });