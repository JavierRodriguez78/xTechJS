import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Payment } from "../domain/payment.js";
import type { PaymentRepository } from "./payment-repository.js";

@Traceable("RefundPayment")
@Service()
export class RefundPayment {
  constructor(@Qualifier("paymentRepository") private readonly repository: PaymentRepository) {}
  execute(id: string): Promise<Payment | undefined> { return this.repository.refund(id); }
}