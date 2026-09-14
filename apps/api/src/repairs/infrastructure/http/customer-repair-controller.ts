import type { FastifyRequest } from "fastify";
import { Controller, Get, Param, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { ApproveCustomerRepairQuoteCommand, GetOwnCustomerQuoteQuery, ListOwnCustomerRepairsQuery } from "../../application/cqrs/repair-messages.js";
import { GetPaymentPdfQuery, GetPaymentReceiptQuery, ListRepairPaymentsQuery } from "../../../payments/application/cqrs/payment-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";

type ControllerReply = { code(statusCode: number): ControllerReply; header(name: string, value: string): ControllerReply; send(payload: unknown): unknown };

@Authenticated()
@Controller("/api/customer/repairs")
export class CustomerRepairController {
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get()
  @PermissionRequired(PERMISSIONS.repairsRead)
  async listOwnRepairs(@Req() request: FastifyRequest): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    return this.queryBus.execute(new ListOwnCustomerRepairsQuery(user.email ?? ""));
  }

  @Get("/:id/quote")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async getOwnQuote(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    const quote = await this.queryBus.execute(new GetOwnCustomerQuoteQuery(id, user.email ?? ""));
    return quote ? quote : reply.code(404).send({ message: "Repair quote not found" });
  }

  @Get("/:repairId/invoices/:paymentId/pdf")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async getOwnInvoice(@Param("repairId") repairId: string, @Param("paymentId") paymentId: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    const receipt = await this.queryBus.execute(new GetPaymentReceiptQuery(paymentId));
    if (!receipt || receipt.repair.id !== repairId || receipt.customer.email?.toLowerCase() !== user.email?.toLowerCase()) {
      return reply.code(404).send({ message: "Invoice not found" });
    }
    const document = await this.queryBus.execute(new GetPaymentPdfQuery(paymentId));
    if (!document) return reply.code(404).send({ message: "Invoice not found" });
    reply.header("content-type", "application/pdf");
    reply.header("content-disposition", `attachment; filename="factura-${receipt.receiptNumber}.pdf"`);
    return reply.send(document);
  }

  @Get("/:repairId/invoices")
  @PermissionRequired(PERMISSIONS.repairsRead)
  async listOwnInvoices(@Param("repairId") repairId: string, @Req() request: FastifyRequest): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    const payments = await this.queryBus.execute(new ListRepairPaymentsQuery(repairId));
    const receipts = await Promise.all((payments as readonly { id: string }[]).map((payment) => this.queryBus.execute(new GetPaymentReceiptQuery(payment.id))));
    return receipts.filter((receipt) => receipt?.customer.email?.toLowerCase() === user.email?.toLowerCase());
  }

  @Post("/:id/quote/approve")
  @PermissionRequired(PERMISSIONS.repairsApproveQuote)
  async approveQuote(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    if (!user.email) return reply.code(403).send({ message: "Customer identity is incomplete" });
    const quote = await this.commandBus.execute(new ApproveCustomerRepairQuoteCommand(id, user.email));
    return quote ? quote : reply.code(404).send({ message: "Repair quote not found" });
  }
}