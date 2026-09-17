import { Body, Controller, Get, Param, Post, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { CreatePaymentCommand, GetDailyPaymentSummaryQuery, GetPaymentPdfQuery, GetPaymentReceiptQuery, GetPaymentReportQuery, ListPaymentsQuery, ListRepairPaymentsQuery, RefundPaymentCommand } from "../../application/cqrs/payment-messages.js";
import { GetInvoiceDraftQuery } from "../../application/cqrs/invoice-draft-messages.js";
import type { AutomaticInvoiceLine } from "../../domain/invoice-draft.js";
import { CloseCashRegisterCommand, GetCashRegisterQuery, OpenCashRegisterCommand } from "../../application/cqrs/cash-register-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import { SendPaymentInvoiceEmail } from "../../application/send-payment-invoice-email.js";

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown }; header(name: string, value: string): ControllerReply; send(payload: unknown): unknown };
const invoiceLineSchema = z.object({ sourceMovementId: z.string().uuid().optional(), code: z.string().trim().max(80).optional(), concept: z.string().trim().min(1).max(500), quantity: z.number().positive().max(1000000), unitPriceCents: z.number().int().nonnegative().max(100000000), discountPercent: z.number().min(0).max(100).default(0), taxRate: z.number().min(0).max(100).default(21) });
const paymentSchema = z.object({ repairOrderId: z.string().uuid(), amountCents: z.number().int().nonnegative().max(100000000), method: z.enum(["cash", "card", "transfer"]), reference: z.string().trim().max(180).optional(), invoiceLines: z.array(invoiceLineSchema).max(100).optional() });
const businessDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

@Authenticated()
@Controller("/api/payments")
export class PaymentController {
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus, private readonly sendPaymentInvoiceEmail: SendPaymentInvoiceEmail) {}

  @Get()
  @PermissionRequired(PERMISSIONS.paymentsManage)
  list(): Promise<unknown> { return this.queryBus.execute(new ListPaymentsQuery()); }

  @Get("/summary/:date")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  summary(@Param("date") date: string): Promise<unknown> { return this.queryBus.execute(new GetDailyPaymentSummaryQuery(date)); }

  @Get("/report/:from/:to")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  report(@Param("from") from: string, @Param("to") to: string, @Res() reply: ControllerReply): Promise<unknown> {
    if (!businessDateSchema.safeParse(from).success || !businessDateSchema.safeParse(to).success || from > to) return Promise.resolve(reply.code(400).send({ message: "Invalid payment report range" }));
    return this.queryBus.execute(new GetPaymentReportQuery(from, to));
  }

  @Get("/cash-register/:date")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  cashRegister(@Param("date") date: string): Promise<unknown> { return this.queryBus.execute(new GetCashRegisterQuery(date)); }

  @Post("/cash-register/:date/open")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async openCashRegister(@Param("date") date: string, @Res() reply: ControllerReply): Promise<unknown> {
    if (!businessDateSchema.safeParse(date).success) return reply.code(400).send({ message: "Invalid business date" });
    try { return reply.code(201).send(await this.commandBus.execute(new OpenCashRegisterCommand(date))); } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  @Post("/cash-register/:date/close")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async closeCashRegister(@Param("date") date: string, @Res() reply: ControllerReply): Promise<unknown> {
    if (!businessDateSchema.safeParse(date).success) return reply.code(400).send({ message: "Invalid business date" });
    try { const register = await this.commandBus.execute(new CloseCashRegisterCommand(date)); return register ? register : reply.code(404).send({ message: "Cash register not found" }); } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  @Get("/repair/:repairOrderId")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  listRepair(@Param("repairOrderId") id: string): Promise<unknown> { return this.queryBus.execute(new ListRepairPaymentsQuery(id)); }

  @Get("/draft/repair/:repairOrderId")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  invoiceDraft(@Param("repairOrderId") id: string): Promise<unknown> { return this.queryBus.execute(new GetInvoiceDraftQuery(id)); }

  @Get("/:id/receipt")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async receipt(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const receipt = await this.queryBus.execute(new GetPaymentReceiptQuery(id));
    return receipt ? receipt : reply.code(404).send({ message: "Payment not found" });
  }

  @Get("/:id/pdf")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async pdf(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const document = await this.queryBus.execute(new GetPaymentPdfQuery(id));
    if (!document) return reply.code(404).send({ message: "Payment not found" });
    reply.header("content-type", "application/pdf");
    reply.header("content-disposition", `attachment; filename="receipt-${id.slice(0, 8)}.pdf"`);
    return reply.send(document);
  }

  @Post("/:id/send-invoice")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async sendInvoice(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    try {
      return reply.code(200).send(await this.sendPaymentInvoiceEmail.execute(id));
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes("not found")) return reply.code(404).send({ message });
      if (message.includes("email")) return reply.code(400).send({ message });
      return reply.code(502).send({ message: "Invoice email could not be sent" });
    }
  }

  @Post()
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async create(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid payment", issues: parsed.error.flatten() });
    const draft = parsed.data.invoiceLines?.length ? undefined : await this.queryBus.execute(new GetInvoiceDraftQuery(parsed.data.repairOrderId));
    const invoiceLines = draft?.lines?.map((line: AutomaticInvoiceLine) => ({ ...line })) ?? parsed.data.invoiceLines;
    return reply.code(201).send(await this.commandBus.execute(new CreatePaymentCommand({ ...parsed.data, invoiceLines })));
  }

  @Post("/:id/refund")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async refund(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    try {
      const payment = await this.commandBus.execute(new RefundPaymentCommand(id));
      return payment ? payment : reply.code(404).send({ message: "Payment not found" });
    } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }
}
