import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { Payment } from "../../domain/payment.js";
import { CreatePayment } from "../create-payment.js";
import { ListPayments } from "../list-payments.js";
import { ListRepairPayments } from "../list-repair-payments.js";
import { RefundPayment } from "../refund-payment.js";
import { GetPaymentReceipt } from "../get-payment-receipt.js";
import { GetDailyPaymentSummary } from "../get-daily-payment-summary.js";
import { GetPaymentReport } from "../get-payment-report.js";
import { GetPaymentPdf } from "../get-payment-pdf.js";
import { CreatePaymentCommand, GetDailyPaymentSummaryQuery, GetPaymentPdfQuery, GetPaymentReceiptQuery, GetPaymentReportQuery, ListPaymentsQuery, ListRepairPaymentsQuery, RefundPaymentCommand } from "./payment-messages.js";

@Service()
@CommandHandler(CreatePaymentCommand)
export class CreatePaymentHandler implements ICommandHandler<CreatePaymentCommand, Payment> {
  constructor(private readonly useCase: CreatePayment) {}
  execute(command: CreatePaymentCommand): Promise<Payment> { return this.useCase.execute(command.input); }
}

@Service()
@QueryHandler(ListPaymentsQuery)
export class ListPaymentsHandler implements IQueryHandler<ListPaymentsQuery, readonly Payment[]> {
  constructor(private readonly useCase: ListPayments) {}
  execute(): Promise<readonly Payment[]> { return this.useCase.execute(); }
}

@Service()
@QueryHandler(ListRepairPaymentsQuery)
export class ListRepairPaymentsHandler implements IQueryHandler<ListRepairPaymentsQuery, readonly Payment[]> {
  constructor(private readonly useCase: ListRepairPayments) {}
  execute(query: ListRepairPaymentsQuery): Promise<readonly Payment[]> { return this.useCase.execute(query.repairOrderId); }
}

@Service()
@CommandHandler(RefundPaymentCommand)
export class RefundPaymentHandler implements ICommandHandler<RefundPaymentCommand, Payment | undefined> {
  constructor(private readonly useCase: RefundPayment) {}
  execute(command: RefundPaymentCommand): Promise<Payment | undefined> { return this.useCase.execute(command.id); }
}

@Service()
@QueryHandler(GetPaymentReceiptQuery)
export class GetPaymentReceiptHandler implements IQueryHandler<GetPaymentReceiptQuery, Awaited<ReturnType<GetPaymentReceipt["execute"]>>> {
  constructor(private readonly useCase: GetPaymentReceipt) {}
  execute(query: GetPaymentReceiptQuery): ReturnType<GetPaymentReceipt["execute"]> { return this.useCase.execute(query.id); }
}

@Service()
@QueryHandler(GetDailyPaymentSummaryQuery)
export class GetDailyPaymentSummaryHandler implements IQueryHandler<GetDailyPaymentSummaryQuery, Awaited<ReturnType<GetDailyPaymentSummary["execute"]>>> {
  constructor(private readonly useCase: GetDailyPaymentSummary) {}
  execute(query: GetDailyPaymentSummaryQuery): ReturnType<GetDailyPaymentSummary["execute"]> { return this.useCase.execute(query.date); }
}

@Service()
@QueryHandler(GetPaymentReportQuery)
export class GetPaymentReportHandler implements IQueryHandler<GetPaymentReportQuery, Awaited<ReturnType<GetPaymentReport["execute"]>>> {
  constructor(private readonly useCase: GetPaymentReport) {}
  execute(query: GetPaymentReportQuery): ReturnType<GetPaymentReport["execute"]> { return this.useCase.execute(query.from, query.to); }
}

@Service()
@QueryHandler(GetPaymentPdfQuery)
export class GetPaymentPdfHandler implements IQueryHandler<GetPaymentPdfQuery, Buffer | undefined> {
  constructor(private readonly useCase: GetPaymentPdf) {}
  execute(query: GetPaymentPdfQuery): Promise<Buffer | undefined> { return this.useCase.execute(query.id); }
}
