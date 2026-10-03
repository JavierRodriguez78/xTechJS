import type { CreatePaymentInput } from "../../domain/payment.js";
export class CreatePaymentCommand { constructor(public readonly input: CreatePaymentInput) {} }
export class ListPaymentsQuery { constructor(public readonly storeIds?: readonly string[] | null) {} }
export class ListTpvSalesQuery { constructor(public readonly storeIds?: readonly string[] | null) {} }
export class ListRepairPaymentsQuery { constructor(public readonly repairOrderId: string) {} }
export class RefundPaymentCommand { constructor(public readonly id: string, public readonly reason: string) {} }
export class GetPaymentReceiptQuery { constructor(public readonly id: string) {} }
export class GetDailyPaymentSummaryQuery { constructor(public readonly date: string, public readonly storeIds?: readonly string[] | null) {} }
export class GetPaymentReportQuery { constructor(public readonly from: string, public readonly to: string, public readonly storeIds?: readonly string[] | null) {} }
export class GetPaymentPdfQuery { constructor(public readonly id: string) {} }
