import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Payment } from "../domain/payment.js";
import type { PaymentRepository } from "./payment-repository.js";

@Traceable("RefundPayment")
@Service()
export class RefundPayment {
  constructor(@Qualifier("paymentRepository") private readonly repository: PaymentRepository) {}
  execute(id: string, reason: string): Promise<Payment | undefined> {
    const normalizedReason = reason.trim();
    if (!normalizedReason) throw new Error("Rectification reason is required");
    return this.repository.createRectification(id, { id: randomUUID(), reason: normalizedReason });
  }
}