import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Payment } from "../domain/payment.js";
import type { PaymentRepository } from "./payment-repository.js";

@Traceable("ListPayments")
@Service()
export class ListPayments {
  constructor(@Qualifier("paymentRepository") private readonly repository: PaymentRepository) {}
  execute(storeIds?: readonly string[] | null): Promise<readonly Payment[]> { return this.repository.findAll(storeIds); }
}
