import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { PaymentMethod } from "../domain/payment.js";
import type { PaymentRepository } from "./payment-repository.js";

export interface DailyPaymentSummary {
  date: string;
  paidCents: number;
  refundedCents: number;
  netCents: number;
  byMethod: Record<PaymentMethod, { paidCents: number; refundedCents: number; netCents: number }>;
}

@Traceable("GetDailyPaymentSummary")
@Service()
export class GetDailyPaymentSummary {
  constructor(@Qualifier("paymentRepository") private readonly repository: PaymentRepository) {}

  async execute(date: string): Promise<DailyPaymentSummary> {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    const payments = (await this.repository.findAll()).filter((payment) => payment.createdAt >= start && payment.createdAt <= end);
    const byMethod = { cash: { paidCents: 0, refundedCents: 0, netCents: 0 }, card: { paidCents: 0, refundedCents: 0, netCents: 0 }, transfer: { paidCents: 0, refundedCents: 0, netCents: 0 } };
    for (const payment of payments) {
      const bucket = byMethod[payment.method];
      if (payment.status === "paid") bucket.paidCents += payment.amountCents;
      else bucket.refundedCents += payment.amountCents;
      bucket.netCents = bucket.paidCents - bucket.refundedCents;
    }
    const paidCents = Object.values(byMethod).reduce((total, bucket) => total + bucket.paidCents, 0);
    const refundedCents = Object.values(byMethod).reduce((total, bucket) => total + bucket.refundedCents, 0);
    return { date, paidCents, refundedCents, netCents: paidCents - refundedCents, byMethod };
  }
}
