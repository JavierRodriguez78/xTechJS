export type EcommerceCategory = "console" | "retro_console" | "game" | "phone" | "tablet" | "accessory" | "other";
export type EcommerceCondition = "new" | "refurbished" | "used_good" | "used_fair";
import { staffSession } from "../auth/session";

export interface ShopProduct {
  id: string;
  sku: string;
  title: string;
  description: string;
  category: EcommerceCategory;
  condition: EcommerceCondition;
  priceCents: number;
  currency: "EUR";
  stockQuantity: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopProductPage {
  items: ShopProduct[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ShopProductListOptions {
  q?: string;
  category?: EcommerceCategory;
  condition?: EcommerceCondition;
  maxPriceCents?: number;
  pagina?: number;
  pageSize?: number;
}

export interface ShopAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ShippingAddress {
  street: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
}

export interface ShopOrder {
  id: string;
  status: "pending_payment" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled" | "refunded";
  totalCents: number;
  shippingAddress: ShippingAddress;
  paymentProvider: "manual";
  paymentReference: string | null;
  createdAt: string;
  updatedAt: string;
  lines: ShopOrderLine[];
}

export interface ShopOrderLine {
  id: string;
  productId: string;
  titleSnapshot: string;
  quantity: number;
  unitPriceCentsSnapshot: number;
}

export interface ShopOrderPage {
  items: ShopOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ShopOrderListOptions {
  status?: ShopOrder["status"];
  pagina?: number;
  pageSize?: number;
}

export interface ManagedShopProductInput {
  sku: string;
  title: string;
  description: string;
  category: EcommerceCategory;
  condition: EcommerceCondition;
  priceCents: number;
  stockQuantity: number;
  published: boolean;
}

export interface ManagedShopProductListOptions {
  q?: string;
  category?: EcommerceCategory;
  published?: boolean;
  pagina?: number;
  pageSize?: number;
}

export type TradeInDeviceType = "console" | "retro_console" | "game" | "phone" | "tablet" | "other";
export type TradeInStatus = "draft" | "submitted" | "in_review" | "proposal_sent" | "accepted" | "rejected" | "completed" | "cancelled";
export interface TradeInRequest {
  id: string;
  customerId: string;
  deviceType: TradeInDeviceType;
  brand: string;
  model: string;
  conditionDescription: string;
  status: TradeInStatus;
  proposedAmountCents: number | null;
  proposalNote: string | null;
  finalAmountCents: number | null;
  decidedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateTradeInRequestInput {
  deviceType: TradeInDeviceType;
  brand: string;
  model: string;
  conditionDescription: string;
}

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudo cargar la tienda." }))).message);
  return response.json() as Promise<T>;
}

export function listShopProducts(options: ShopProductListOptions = {}): Promise<ShopProductPage> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) if (value !== undefined && value !== "") search.set(key, String(value));
  return request<ShopProductPage>(`/api/shop/products${search.size ? `?${search}` : ""}`);
}

export const getShopProduct = (id: string) => request<ShopProduct>(`/api/shop/products/${id}`);
export const getShopProductAttachments = (id: string) => request<ShopAttachment[]>(`/api/shop/products/${id}/attachments`);
export const shopProductAttachmentUrl = (productId: string, attachmentId: string) => `/api/shop/products/${encodeURIComponent(productId)}/attachments/${encodeURIComponent(attachmentId)}`;
export async function placeShopOrder(accessToken: string, input: { lines: { productId: string; quantity: number }[]; shippingAddress: ShippingAddress }): Promise<ShopOrder> {
  const response = await fetch("/api/customer/orders", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudo registrar el pedido." }))).message);
  return response.json() as Promise<ShopOrder>;
}

async function customerRequest<T>(accessToken: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { authorization: `Bearer ${accessToken}`, ...init?.headers } });
  if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudieron cargar tus pedidos." }))).message);
  return response.json() as Promise<T>;
}

export const listCustomerShopOrders = (accessToken: string) => customerRequest<ShopOrder[]>(accessToken, "/api/customer/orders");
export const getCustomerShopOrder = (accessToken: string, id: string) => customerRequest<ShopOrder>(accessToken, `/api/customer/orders/${encodeURIComponent(id)}`);
export async function downloadCustomerShopInvoice(accessToken: string, id: string): Promise<Blob> {
  const response = await fetch(`/api/customer/orders/${encodeURIComponent(id)}/invoice.pdf`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudo descargar la factura." }))).message);
  return response.blob();
}
export const listCustomerTradeInRequests = (accessToken: string) => customerRequest<TradeInRequest[]>(accessToken, "/api/customer/trade-in-requests");
export const getCustomerTradeInRequest = (accessToken: string, id: string) => customerRequest<TradeInRequest>(accessToken, `/api/customer/trade-in-requests/${encodeURIComponent(id)}`);
export const createCustomerTradeInRequest = (accessToken: string, input: CreateTradeInRequestInput) => customerRequest<TradeInRequest>(accessToken, "/api/customer/trade-in-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
export const listCustomerTradeInAttachments = (accessToken: string, id: string) => customerRequest<ShopAttachment[]>(accessToken, `/api/customer/trade-in-requests/${encodeURIComponent(id)}/attachments`);
export const submitCustomerTradeInRequest = (accessToken: string, id: string) => customerRequest<TradeInRequest>(accessToken, `/api/customer/trade-in-requests/${encodeURIComponent(id)}/submit`, { method: "POST" });
export const decideCustomerTradeInRequest = (accessToken: string, id: string, decision: "accept" | "reject") => customerRequest<TradeInRequest>(accessToken, `/api/customer/trade-in-requests/${encodeURIComponent(id)}/${decision}`, { method: "POST" });
export async function uploadCustomerTradeInAttachment(accessToken: string, id: string, file: File): Promise<ShopAttachment> {
  const body = new FormData();
  body.set("file", file);
  return customerRequest<ShopAttachment>(accessToken, `/api/customer/trade-in-requests/${encodeURIComponent(id)}/attachments`, { method: "POST", body });
}

async function staffRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${staffSession.value?.accessToken ?? ""}`, ...init?.headers } });
  if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudo completar la operación." }))).message);
  return response.json() as Promise<T>;
}

export function listManagedShopOrders(options: ShopOrderListOptions = {}): Promise<ShopOrderPage> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) if (value !== undefined && value !== "") search.set(key, String(value));
  return staffRequest<ShopOrderPage>(`/api/ecommerce/orders${search.size ? `?${search}` : ""}`);
}

export const updateManagedShopOrderStatus = (id: string, status: ShopOrder["status"]) => staffRequest<ShopOrder>(`/api/ecommerce/orders/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
export function listManagedShopProducts(options: ManagedShopProductListOptions = {}): Promise<ShopProductPage> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) if (value !== undefined && value !== "") search.set(key, String(value));
  return staffRequest<ShopProductPage>(`/api/ecommerce/products${search.size ? `?${search}` : ""}`);
}
export const getManagedShopProduct = (id: string) => staffRequest<ShopProduct>(`/api/ecommerce/products/${encodeURIComponent(id)}`);
export const createManagedShopProduct = (input: ManagedShopProductInput) => staffRequest<ShopProduct>("/api/ecommerce/products", { method: "POST", body: JSON.stringify(input) });
export const updateManagedShopProduct = (id: string, input: ManagedShopProductInput) => staffRequest<ShopProduct>(`/api/ecommerce/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
export const getManagedShopProductAttachments = (id: string) => staffRequest<ShopAttachment[]>(`/api/ecommerce/products/${encodeURIComponent(id)}/attachments`);
export async function uploadManagedShopProductAttachment(id: string, file: File): Promise<ShopAttachment> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch(`/api/ecommerce/products/${encodeURIComponent(id)}/attachments`, { method: "POST", headers: { authorization: `Bearer ${staffSession.value?.accessToken ?? ""}` }, body });
  if (!response.ok) throw new Error((await response.json().catch(() => ({ message: "No se pudo subir el adjunto." }))).message);
  return response.json() as Promise<ShopAttachment>;
}
export const listManagedTradeInRequests = (status?: Exclude<TradeInStatus, "draft">) => staffRequest<TradeInRequest[]>(`/api/trade-in-requests${status ? `?status=${encodeURIComponent(status)}` : ""}`);
export const getManagedTradeInRequest = (id: string) => staffRequest<TradeInRequest>(`/api/trade-in-requests/${encodeURIComponent(id)}`);
export const listManagedTradeInAttachments = (id: string) => staffRequest<ShopAttachment[]>(`/api/trade-in-requests/${encodeURIComponent(id)}/attachments`);
export const reviewManagedTradeInRequest = (id: string) => staffRequest<TradeInRequest>(`/api/trade-in-requests/${encodeURIComponent(id)}/review`, { method: "PATCH" });
export const proposeManagedTradeInRequest = (id: string, input: { proposedAmountCents: number; proposalNote?: string }) => staffRequest<TradeInRequest>(`/api/trade-in-requests/${encodeURIComponent(id)}/propose`, { method: "PATCH", body: JSON.stringify(input) });
export const completeManagedTradeInRequest = (id: string, input: { finalAmountCents: number; method: "bank_transfer" | "cash"; reference?: string }) => staffRequest<TradeInRequest>(`/api/trade-in-requests/${encodeURIComponent(id)}/complete`, { method: "PATCH", body: JSON.stringify(input) });
