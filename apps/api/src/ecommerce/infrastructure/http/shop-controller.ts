import type { FastifyRequest } from "fastify";
import { Body, Controller, Get, Param, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { z } from "zod";
import { GetPublicProductQuery, ListPublicProductsQuery, RegisterShopCustomerCommand } from "../../application/cqrs/ecommerce-messages.js";
import { ShopRegistrationEmailTakenError, ShopRegistrationPasswordError } from "../../application/register-shop-customer.js";
import { GetEcommerceAttachmentQuery, ListEcommerceAttachmentsQuery } from "../../../attachments/application/cqrs/attachment-messages.js";
import type { RepairAttachment } from "../../../attachments/domain/repair-attachment.js";

const registrationSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(256),
  phone: z.string().trim().max(64).optional(),
  consentAccepted: z.boolean().refine((value) => value === true, "Consent is required"),
  consentText: z.string().trim().min(1).max(5000)
});
const productsQuerySchema = z.object({ q: z.string().trim().min(1).max(160).optional(), category: z.enum(["console", "retro_console", "game", "phone", "tablet", "accessory", "other"]).optional(), condition: z.enum(["new", "refurbished", "used_good", "used_fair"]).optional(), maxPriceCents: z.coerce.number().int().nonnegative().optional(), pagina: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });

type ControllerReply = { code(statusCode: number): ControllerReply; header(name: string, value: string): ControllerReply; send(payload: unknown): unknown };

@Controller("/api/shop")
export class ShopController {
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get("/products")
  async listProducts(@Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = productsQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid product list query", issues: parsed.error.flatten() });
    return this.queryBus.execute(new ListPublicProductsQuery({ query: parsed.data.q, category: parsed.data.category, condition: parsed.data.condition, maxPriceCents: parsed.data.maxPriceCents, page: parsed.data.pagina, pageSize: parsed.data.pageSize }));
  }

  @Get("/products/:id")
  async getProduct(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const product = await this.queryBus.execute(new GetPublicProductQuery(id));
    return product ?? reply.code(404).send({ message: "Product not found" });
  }

  @Get("/products/:id/attachments")
  async listProductAttachments(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const product = await this.queryBus.execute(new GetPublicProductQuery(id));
    if (!product) return reply.code(404).send({ message: "Product not found" });
    const attachments = await this.queryBus.execute<readonly RepairAttachment[]>(new ListEcommerceAttachmentsQuery("product", id));
    return attachments.map(({ id: attachmentId, fileName, mimeType, sizeBytes, createdAt }) => ({ id: attachmentId, fileName, mimeType, sizeBytes, createdAt }));
  }

  @Get("/products/:id/attachments/:attachmentId")
  async downloadProductAttachment(@Param("id") id: string, @Param("attachmentId") attachmentId: string, @Res() reply: ControllerReply): Promise<unknown> {
    const product = await this.queryBus.execute(new GetPublicProductQuery(id));
    if (!product) return reply.code(404).send({ message: "Product not found" });
    const download = await this.queryBus.execute(new GetEcommerceAttachmentQuery("product", id, attachmentId));
    if (!download) return reply.code(404).send({ message: "Attachment not found" });
    reply.header("content-type", download.attachment.mimeType);
    reply.header("content-disposition", `inline; filename="${encodeURIComponent(download.attachment.fileName)}"`);
    return reply.send(download.buffer);
  }

  @Post("/register")
  async register(@Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid shop registration", issues: parsed.error.flatten() });
    try {
      const customer = await this.commandBus.execute(new RegisterShopCustomerCommand({
        displayName: parsed.data.displayName,
        email: parsed.data.email,
        password: parsed.data.password,
        phone: parsed.data.phone,
        consentText: parsed.data.consentText
      }, request.ip ?? null));
      return reply.code(201).send(customer);
    } catch (error) {
      if (error instanceof ShopRegistrationEmailTakenError) return reply.code(409).send({ message: error.message });
      if (error instanceof ShopRegistrationPasswordError) return reply.code(400).send({ message: error.message });
      throw error;
    }
  }
}
