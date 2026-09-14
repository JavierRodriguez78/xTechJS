import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CreatePaymentInput, InvoiceLine, Payment } from "../domain/payment.js";
import type { PaymentRepository } from "./payment-repository.js";

@Traceable("CreatePayment")
@Service()
export class CreatePayment {
  constructor(@Qualifier("paymentRepository") private readonly repository: PaymentRepository) {}

  execute(input: CreatePaymentInput): Promise<Payment> {
    if (input.invoiceLines?.length) {
      const totalCents = input.invoiceLines.reduce((total, line) => {
        const net = Math.round(line.quantity * line.unitPriceCents * (1 - line.discountPercent / 100));
        return total + net + Math.round(net * line.taxRate / 100);
      }, 0);
      if (totalCents <= 0 || input.amountCents !== totalCents) throw new Error("Payment amount does not match invoice lines");
    } else if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      throw new Error("Payment amount must be a positive integer");
    }
    const invoiceLines = input.invoiceLines?.map((line): InvoiceLine => ({ ...line, concept: line.concept.trim(), code: line.code?.trim() || undefined }));
    return this.repository.create({ ...input, id: randomUUID(), reference: input.reference?.trim(), invoiceLines });
  }
}
