import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CreatePaymentInput, Payment } from "../domain/payment.js";
import type { PaymentRepository } from "./payment-repository.js";

@Traceable("CreatePayment")
@Service()
export class CreatePayment {
  constructor(@Qualifier("paymentRepository") private readonly repository: PaymentRepository) {}

  execute(input: CreatePaymentInput): Promise<Payment> {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Payment amount must be a positive integer");
    return this.repository.create({ ...input, id: randomUUID(), reference: input.reference?.trim() });
  }
}
