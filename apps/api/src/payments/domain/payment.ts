export type PaymentMethod = "cash" | "card" | "transfer";
export type PaymentStatus = "paid" | "refunded";

export interface Payment {
  id: string;
  repairOrderId: string;
  amountCents: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  createdAt: Date;
}

export interface CreatePaymentInput {
  repairOrderId: string;
  amountCents: number;
  method: PaymentMethod;
  reference?: string;
}
