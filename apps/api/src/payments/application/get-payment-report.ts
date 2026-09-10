import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { PaymentMethod } from "../domain/payment.js";
import type { PaymentRepository } from "./payment-repository.js";

export interface PaymentReportDay {
  date: string;
  paidCents: number;
  refundedCents: number;
  netCents: number;
  byMethod: Record<PaymentMethod, { paidCents: number; refundedCents: number; netCents: number }>;
}

export interface PaymentReport {
  from: string;
  to: string;
  paidCents: number;
  refundedCents: number;
  netCents: number;
  days: PaymentReportDay[];
  byTechnician: Record<string, { paidCents: number; refundedCents: number; netCents: number }>;
  byDeviceType: Record<string, { paidCents: number; refundedCents: number; netCents: number }>;
}

@Traceable("GetPaymentReport")
@Service()
export class GetPaymentReport {
  constructor(@Qualifier("paymentRepository") private readonly repository: PaymentRepository) {}

  async execute(from: string, to: string): Promise<PaymentReport> {
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);
    const rows = await this.repository.findReportRows(start, end);
    const payments = rows.map((row) => row.payment);
    const grouped = new Map<string, PaymentReportDay>();
    const byTechnician: PaymentReport["byTechnician"] = {};
    const byDeviceType: PaymentReport["byDeviceType"] = {};
    for (const row of rows) {
      const payment = row.payment;
      const date = payment.createdAt.toISOString().slice(0, 10);
      let day = grouped.get(date);
      if (!day) {
        day = { date, paidCents: 0, refundedCents: 0, netCents: 0, byMethod: { cash: { paidCents: 0, refundedCents: 0, netCents: 0 }, card: { paidCents: 0, refundedCents: 0, netCents: 0 }, transfer: { paidCents: 0, refundedCents: 0, netCents: 0 } } };
        grouped.set(date, day);
      }
      const bucket = day.byMethod[payment.method];
      if (payment.status === "paid") { day.paidCents += payment.amountCents; bucket.paidCents += payment.amountCents; }
      else { day.refundedCents += payment.amountCents; bucket.refundedCents += payment.amountCents; }
      bucket.netCents = bucket.paidCents - bucket.refundedCents;
      day.netCents = day.paidCents - day.refundedCents;
      const dimensions = [row.technicianId ? `technician:${row.technicianId}` : "technician:unassigned", `device:${row.deviceType}`];
      for (const dimension of dimensions) {
        const bucket = (dimension.startsWith("technician:") ? byTechnician : byDeviceType)[dimension.replace(/^(technician|device):/, "")]
          ?? ((dimension.startsWith("technician:") ? byTechnician : byDeviceType)[dimension.replace(/^(technician|device):/, "")] = { paidCents: 0, refundedCents: 0, netCents: 0 });
        if (payment.status === "paid") bucket.paidCents += payment.amountCents;
        else bucket.refundedCents += payment.amountCents;
        bucket.netCents = bucket.paidCents - bucket.refundedCents;
      }
    }
    const days = [...grouped.values()].sort((left, right) => left.date.localeCompare(right.date));
    return { from, to, paidCents: days.reduce((total, day) => total + day.paidCents, 0), refundedCents: days.reduce((total, day) => total + day.refundedCents, 0), netCents: days.reduce((total, day) => total + day.netCents, 0), days, byTechnician, byDeviceType };
  }
}
