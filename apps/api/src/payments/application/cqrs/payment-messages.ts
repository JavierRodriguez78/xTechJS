import type { CreatePaymentInput } from "../../domain/payment.js";
export class CreatePaymentCommand { constructor(public readonly input: CreatePaymentInput) {} }
export class ListPaymentsQuery {}
export class ListRepairPaymentsQuery { constructor(public readonly repairOrderId: string) {} }
export class RefundPaymentCommand { constructor(public readonly id: string) {} }
export class GetPaymentReceiptQuery { constructor(public readonly id: string) {} }
export class GetDailyPaymentSummaryQuery { constructor(public readonly date: string) {} }
export class GetPaymentReportQuery { constructor(public readonly from: string, public readonly to: string) {} }
export class GetPaymentPdfQuery { constructor(public readonly id: string) {} }
