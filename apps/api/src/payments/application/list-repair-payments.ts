import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Payment } from "../domain/payment.js";
import type { PaymentRepository } from "./payment-repository.js";

@Traceable("ListRepairPayments")
@Service()
export class ListRepairPayments {
  constructor(@Qualifier("paymentRepository") private readonly repository: PaymentRepository) {}
  execute(repairOrderId: string): Promise<readonly Payment[]> { return this.repository.findByRepairOrderId(repairOrderId); }
}
