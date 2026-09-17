export type PaymentMethod = "cash" | "card" | "transfer";
export type PaymentStatus = "paid" | "refunded";
export type InvoiceDocumentType = "invoice" | "rectification";

export interface InvoiceLine {
  sourceMovementId?: string;
  code?: string;
  concept: string;
  quantity: number;
  unitPriceCents: number;
  discountPercent: number;
  taxRate: number;
}

export interface Payment {
  id: string;
  repairOrderId: string;
  amountCents: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  invoiceSeries?: string;
  invoiceNumber?: number;
  invoiceLines?: InvoiceLine[];
  documentType?: InvoiceDocumentType;
  originalPaymentId?: string | null;
  rectificationReason?: string | null;
  createdAt: Date;
}

export interface CreatePaymentInput {
  repairOrderId: string;
  amountCents: number;
  method: PaymentMethod;
  reference?: string;
  invoiceLines?: InvoiceLine[];
}
