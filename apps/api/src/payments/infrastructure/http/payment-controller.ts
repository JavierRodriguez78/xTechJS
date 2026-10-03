import { Body, Controller, Get, Param, Post, Req, Res } from "@xtaskjs/common";
import type { FastifyRequest } from "fastify";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { CreatePaymentCommand, GetDailyPaymentSummaryQuery, GetPaymentPdfQuery, GetPaymentReceiptQuery, GetPaymentReportQuery, ListPaymentsQuery, ListRepairPaymentsQuery, ListTpvSalesQuery, RefundPaymentCommand } from "../../application/cqrs/payment-messages.js";
import { GetInvoiceDraftQuery } from "../../application/cqrs/invoice-draft-messages.js";
import type { AutomaticInvoiceLine } from "../../domain/invoice-draft.js";
import { CloseCashRegisterCommand, GetCashRegisterQuery, OpenCashRegisterCommand } from "../../application/cqrs/cash-register-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import { SendPaymentInvoiceEmail } from "../../application/send-payment-invoice-email.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";
import { canAccessStore, getStoreAccess } from "../../../users/domain/store-access.js";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown }; header(name: string, value: string): ControllerReply; send(payload: unknown): unknown };
const invoiceLineSchema = z.object({ sourceMovementId: z.string().uuid().optional(), code: z.string().trim().max(80).optional(), concept: z.string().trim().min(1).max(500), quantity: z.number().positive().max(1000000), unitPriceCents: z.number().int().nonnegative().max(100000000), discountPercent: z.number().min(0).max(100).default(0), taxRate: z.number().min(0).max(100).default(21) });
const paymentSchema = z.object({ repairOrderId: z.string().uuid(), amountCents: z.number().int().nonnegative().max(100000000), method: z.enum(["cash", "card", "transfer"]), reference: z.string().trim().max(180).optional(), invoiceLines: z.array(invoiceLineSchema).max(100).optional() });
const rectificationSchema = z.object({ reason: z.string().trim().min(3).max(500) });
const businessDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

@Authenticated()
@Controller("/api/payments")
export class PaymentController {
  @InjectDataSource() private readonly dataSource!: DataSource;
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus, private readonly sendPaymentInvoiceEmail: SendPaymentInvoiceEmail) {}

  private async canAccessRepair(user: AuthTokenPayload, repairOrderId: string): Promise<boolean> {
    const access = getStoreAccess(user);
    if (access === null) return true;
    if (!access.length) return false;
    const rows = await this.dataSource.query('SELECT 1 FROM repair_orders WHERE id = $1 AND store_id = ANY($2::uuid[]) LIMIT 1', [repairOrderId, access]);
    return rows.length > 0;
  }

  private async canAccessPayment(user: AuthTokenPayload, paymentId: string): Promise<boolean> {
    const access = getStoreAccess(user);
    if (access === null) return true;
    if (!access.length) return false;
    const rows = await this.dataSource.query('SELECT 1 FROM payments payment JOIN repair_orders repair ON repair.id = payment.repair_order_id WHERE payment.id = $1 AND repair.store_id = ANY($2::uuid[]) LIMIT 1', [paymentId, access]);
    return rows.length > 0;
  }

  private async cashStore(request: FastifyRequest, reply: ControllerReply): Promise<string | undefined> {
    const parsed = z.object({ storeId: z.string().uuid().optional() }).safeParse(request.query);
    if (!parsed.success) { reply.code(400).send({ message: "Selecciona una tienda valida." }); return undefined; }
    const user = request.user as AuthTokenPayload;
    const access = getStoreAccess(user);
    const storeId = parsed.data.storeId ?? user.defaultStoreId ?? user.storeId ?? (access?.length === 1 ? access[0] : undefined);
    if (!storeId) { reply.code(400).send({ message: "Selecciona una tienda para la caja." }); return undefined; }
    if (!canAccessStore(user, storeId)) { reply.code(403).send({ message: "No tienes acceso a la tienda seleccionada." }); return undefined; }
    const rows = await this.dataSource.query('SELECT 1 FROM stores WHERE id = $1 AND active = true', [storeId]);
    if (!rows.length) { reply.code(400).send({ message: "La tienda no existe o esta inactiva." }); return undefined; }
    return storeId;
  }

  @Get()
  @PermissionRequired(PERMISSIONS.paymentsManage)
  list(@Req() request: FastifyRequest): Promise<unknown> { return this.queryBus.execute(new ListPaymentsQuery(getStoreAccess(request.user as AuthTokenPayload))); }

  @Get("/sales")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  listSales(@Req() request: FastifyRequest): Promise<unknown> { return this.queryBus.execute(new ListTpvSalesQuery(getStoreAccess(request.user as AuthTokenPayload))); }

  @Get("/summary/:date")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async summary(@Param("date") date: string, @Req() request: FastifyRequest): Promise<unknown> { const access = getStoreAccess(request.user as AuthTokenPayload); return this.queryBus.execute(new GetDailyPaymentSummaryQuery(date, access)); }

  @Get("/report/:from/:to")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  report(@Param("from") from: string, @Param("to") to: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!businessDateSchema.safeParse(from).success || !businessDateSchema.safeParse(to).success || from > to) return Promise.resolve(reply.code(400).send({ message: "Invalid payment report range" }));
    return this.queryBus.execute(new GetPaymentReportQuery(from, to, getStoreAccess(request.user as AuthTokenPayload)));
  }

  @Get("/cash-register/:date")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async cashRegister(@Param("date") date: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> { const storeId = await this.cashStore(request, reply); return storeId ? this.queryBus.execute(new GetCashRegisterQuery(date, storeId)) : undefined; }

  @Post("/cash-register/:date/open")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async openCashRegister(@Param("date") date: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!businessDateSchema.safeParse(date).success) return reply.code(400).send({ message: "Invalid business date" });
    const storeId = await this.cashStore(request, reply);
    if (!storeId) return undefined;
    try { return reply.code(201).send(await this.commandBus.execute(new OpenCashRegisterCommand(date, storeId))); } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  @Post("/cash-register/:date/close")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async closeCashRegister(@Param("date") date: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!businessDateSchema.safeParse(date).success) return reply.code(400).send({ message: "Invalid business date" });
    const storeId = await this.cashStore(request, reply);
    if (!storeId) return undefined;
    try { const register = await this.commandBus.execute(new CloseCashRegisterCommand(date, storeId)); return register ? register : reply.code(404).send({ message: "Cash register not found" }); } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  @Get("/repair/:repairOrderId")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async listRepair(@Param("repairOrderId") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> { if (!await this.canAccessRepair(request.user as AuthTokenPayload, id)) return reply.code(404).send({ message: "Repair order not found" }); return this.queryBus.execute(new ListRepairPaymentsQuery(id)); }

  @Get("/draft/repair/:repairOrderId")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async invoiceDraft(@Param("repairOrderId") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> { if (!await this.canAccessRepair(request.user as AuthTokenPayload, id)) return reply.code(404).send({ message: "Repair order not found" }); return this.queryBus.execute(new GetInvoiceDraftQuery(id)); }

  @Get("/:id/receipt")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async receipt(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!await this.canAccessPayment(request.user as AuthTokenPayload, id)) return reply.code(404).send({ message: "Payment not found" });
    const receipt = await this.queryBus.execute(new GetPaymentReceiptQuery(id));
    return receipt ? receipt : reply.code(404).send({ message: "Payment not found" });
  }

  @Get("/:id/pdf")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async pdf(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!await this.canAccessPayment(request.user as AuthTokenPayload, id)) return reply.code(404).send({ message: "Payment not found" });
    const document = await this.queryBus.execute(new GetPaymentPdfQuery(id));
    if (!document) return reply.code(404).send({ message: "Payment not found" });
    reply.header("content-type", "application/pdf");
    reply.header("content-disposition", `attachment; filename="receipt-${id.slice(0, 8)}.pdf"`);
    return reply.send(document);
  }

  @Post("/:id/send-invoice")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async sendInvoice(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!await this.canAccessPayment(request.user as AuthTokenPayload, id)) return reply.code(404).send({ message: "Payment not found" });
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
  async create(@Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid payment", issues: parsed.error.flatten() });
    if (!await this.canAccessRepair(request.user as AuthTokenPayload, parsed.data.repairOrderId)) return reply.code(404).send({ message: "Repair order not found" });
    const draft = parsed.data.invoiceLines?.length ? undefined : await this.queryBus.execute(new GetInvoiceDraftQuery(parsed.data.repairOrderId));
    const invoiceLines = draft?.lines?.map((line: AutomaticInvoiceLine) => ({ ...line })) ?? parsed.data.invoiceLines;
    return reply.code(201).send(await this.commandBus.execute(new CreatePaymentCommand({ ...parsed.data, invoiceLines })));
  }

  @Post("/:id/refund")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async refund(@Param("id") id: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!await this.canAccessPayment(request.user as AuthTokenPayload, id)) return reply.code(404).send({ message: "Payment not found" });
    const parsed = rectificationSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Rectification reason is required", issues: parsed.error.flatten() });
    try {
      const payment = await this.commandBus.execute(new RefundPaymentCommand(id, parsed.data.reason));
      return payment ? payment : reply.code(404).send({ message: "Payment not found" });
    } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }
}
