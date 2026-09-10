import type { CreatePaymentInput } from "../../domain/payment.js";
export class CreatePaymentCommand { constructor(public readonly input: CreatePaymentInput) {} }
export class ListPaymentsQuery {}
export class ListRepairPaymentsQuery { constructor(public readonly repairOrderId: string) {} }
export class RefundPaymentCommand { constructor(public readonly id: string) {} }
