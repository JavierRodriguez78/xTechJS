import type { CreatePaymentInput, Payment } from "../domain/payment.js";

export interface PaymentRepository {
  create(input: CreatePaymentInput & { id: string }): Promise<Payment>;
  findAll(): Promise<readonly Payment[]>;
  findByRepairOrderId(repairOrderId: string): Promise<readonly Payment[]>;
}
