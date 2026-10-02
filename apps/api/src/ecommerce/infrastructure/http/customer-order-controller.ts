import type { FastifyRequest } from "fastify";
import { Body, Controller, Get, Param, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { GetCustomerEcommerceOrderQuery, ListCustomerEcommerceOrdersQuery, PlaceEcommerceOrderCommand } from "../../application/cqrs/ecommerce-messages.js";
import { ProductStockUnavailableError } from "../../application/ecommerce-service.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";
import { GetEcommerceOrderInvoicePdf } from "../../application/get-ecommerce-order-invoice-pdf.js";

const orderSchema = z.object({
  lines: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(100) })).min(1).max(50),
  shippingAddress: z.object({ street: z.string().trim().min(1).max(240), postalCode: z.string().trim().min(1).max(20), city: z.string().trim().min(1).max(120), province: z.string().trim().min(1).max(120), country: z.string().trim().min(1).max(120) })
});

type ControllerReply = { code(statusCode: number): ControllerReply; header(name: string, value: string): ControllerReply; send(payload: unknown): unknown };

@Authenticated()
@Controller("/api/customer/orders")
export class CustomerOrderController {
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus, private readonly getInvoicePdf: GetEcommerceOrderInvoicePdf) {}

  @Get()
  list(@Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    return user.role === "customer" ? this.queryBus.execute(new ListCustomerEcommerceOrdersQuery(user.sub)) : Promise.resolve(reply.code(403).send({ message: "Customer access required" }));
  }

  @Get("/:id")
  async get(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    if (user.role !== "customer") return reply.code(403).send({ message: "Customer access required" });
    const order = await this.queryBus.execute(new GetCustomerEcommerceOrderQuery(id, user.sub));
    return order ?? reply.code(404).send({ message: "Order not found" });
  }

  @Get("/:id/invoice.pdf")
  async invoicePdf(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    if (user.role !== "customer") return reply.code(403).send({ message: "Customer access required" });
    const order = await this.queryBus.execute(new GetCustomerEcommerceOrderQuery(id, user.sub));
    if (!order) return reply.code(404).send({ message: "Invoice not found" });
    const document = await this.getInvoicePdf.execute(id);
    if (!document) return reply.code(404).send({ message: "Invoice not found" });
    reply.header("content-type", "application/pdf");
    reply.header("content-disposition", `attachment; filename="factura-${id.slice(0, 8)}.pdf"`);
    return reply.send(document);
  }

  @Post()
  async place(@Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    if (user.role !== "customer") return reply.code(403).send({ message: "Customer access required" });
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid order", issues: parsed.error.flatten() });
    try {
      return reply.code(201).send(await this.commandBus.execute(new PlaceEcommerceOrderCommand(user.sub, parsed.data)));
    } catch (error) {
      if (error instanceof ProductStockUnavailableError) return reply.code(409).send({ message: error.message });
      throw error;
    }
  }
}
