import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Payment } from "../domain/payment.js";
import type { PaymentRepository } from "./payment-repository.js";

export interface PaymentReceipt {
  receiptNumber: string;
  invoiceSeries: string;
  invoiceNumber: number;
  payment: Payment;
  repair: { id: string; deviceType: string; brand: string; model: string; reportedIssue: string };
  customer: { displayName: string; email: string | null; taxId: string | null; billingName: string | null; billingAddress: string | null; billingPostalCode: string | null; billingCity: string | null; billingProvince: string | null };
  issuedAt: Date;
}

@Traceable("GetPaymentReceipt")
@Service()
export class GetPaymentReceipt {
  constructor(@Qualifier("paymentRepository") private readonly repository: PaymentRepository) {}

  async execute(id: string): Promise<PaymentReceipt | undefined> {
    const data = await this.repository.findReceiptData(id);
    if (!data) return undefined;
    const invoiceSeries = data.payment.invoiceSeries ?? "B";
    const invoiceNumber = data.payment.invoiceNumber ?? 0;
    const quantity = data.payment.documentType === "rectification" ? -1 : 1;
    const invoiceLines = data.payment.invoiceLines?.length ? data.payment.invoiceLines : [{ concept: "Servicio de reparacion", quantity, unitPriceCents: Math.round(data.payment.amountCents / 1.21), discountPercent: 0, taxRate: 21 }];
    return { receiptNumber: `${invoiceSeries}-${String(invoiceNumber).padStart(6, "0")}`, invoiceSeries, invoiceNumber, ...data, payment: { ...data.payment, invoiceLines }, issuedAt: data.payment.createdAt };
  }
}
