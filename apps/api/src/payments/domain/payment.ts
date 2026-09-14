export type PaymentMethod = "cash" | "card" | "transfer";
export type PaymentStatus = "paid" | "refunded";

export interface InvoiceLine {
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
  createdAt: Date;
}

export interface CreatePaymentInput {
  repairOrderId: string;
  amountCents: number;
  method: PaymentMethod;
  reference?: string;
  invoiceLines?: InvoiceLine[];
}
