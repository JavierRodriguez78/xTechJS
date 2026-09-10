import type { CreatePaymentInput, Payment } from "../domain/payment.js";

export interface PaymentReportRow {
  payment: Payment;
  technicianId: string | null;
  deviceType: string;
}

export interface PaymentReceiptData {
  payment: Payment;
  repair: { id: string; deviceType: string; brand: string; model: string; reportedIssue: string };
  customer: { displayName: string; email: string | null; taxId: string | null };
}

export interface PaymentRepository {
  create(input: CreatePaymentInput & { id: string }): Promise<Payment>;
  findAll(): Promise<readonly Payment[]>;
  findByRepairOrderId(repairOrderId: string): Promise<readonly Payment[]>;
  refund(id: string): Promise<Payment | undefined>;
  findReportRows(from: Date, to: Date): Promise<readonly PaymentReportRow[]>;
  findReceiptData(id: string): Promise<PaymentReceiptData | undefined>;
}
