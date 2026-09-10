import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Payment } from "../domain/payment.js";
import type { PaymentRepository } from "./payment-repository.js";

export interface PaymentReceipt {
  receiptNumber: string;
  payment: Payment;
  repair: { id: string; deviceType: string; brand: string; model: string; reportedIssue: string };
  customer: { displayName: string; email: string | null; taxId: string | null };
  issuedAt: Date;
}

@Traceable("GetPaymentReceipt")
@Service()
export class GetPaymentReceipt {
  constructor(@Qualifier("paymentRepository") private readonly repository: PaymentRepository) {}

  async execute(id: string): Promise<PaymentReceipt | undefined> {
    const data = await this.repository.findReceiptData(id);
    if (!data) return undefined;
    return { receiptNumber: `R-${data.payment.id.slice(0, 8).toUpperCase()}`, ...data, issuedAt: new Date() };
  }
}
