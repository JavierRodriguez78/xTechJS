import type { FastifyRequest } from "fastify";
import { Body, Controller, Get, Param, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { z } from "zod";
import { GetPublicProductQuery, GetShopRegistrationVerificationQuery, ListPublicProductsQuery, RegisterShopCustomerCommand, RequestShopRegistrationVerificationCommand } from "../../application/cqrs/ecommerce-messages.js";
import { ShopRegistrationEmailTakenError, ShopRegistrationPasswordError, ShopRegistrationVerificationInvalidError } from "../../application/register-shop-customer.js";
import { GetEcommerceAttachmentQuery, ListEcommerceAttachmentsQuery } from "../../../attachments/application/cqrs/attachment-messages.js";
import type { RepairAttachment } from "../../../attachments/domain/repair-attachment.js";

const registrationRequestSchema = z.object({ email: z.string().trim().email().max(320) });
const registrationCompletionSchema = z.object({
  email: z.string().trim().email().max(320),
  displayName: z.string().trim().min(1).max(160),
  password: z.string().min(12).max(256),
  phone: z.string().trim().max(64).optional(),
  taxId: z.string().trim().max(64).optional(),
  customerType: z.enum(["individual", "business"]).optional(),
  addressStreet: z.string().trim().max(500).optional(),
  addressPostalCode: z.string().trim().max(20).optional(),
  addressCity: z.string().trim().max(120).optional(),
  addressProvince: z.string().trim().max(120).optional(),
  addressCountry: z.string().trim().max(120).optional(),
  billingName: z.string().trim().max(160).optional(),
  billingTaxId: z.string().trim().max(64).optional(),
  billingAddressStreet: z.string().trim().max(500).optional(),
  billingAddressPostalCode: z.string().trim().max(20).optional(),
  billingAddressCity: z.string().trim().max(120).optional(),
  billingAddressProvince: z.string().trim().max(120).optional(),
  billingAddressCountry: z.string().trim().max(120).optional(),
  useContactAddressForBilling: z.boolean().optional(),
  consentAccepted: z.boolean().refine((value) => value === true, "Consent is required"),
  consentText: z.string().trim().min(1).max(5000)
});
const productsQuerySchema = z.object({ q: z.string().trim().min(1).max(160).optional(), category: z.enum(["console", "retro_console", "game", "phone", "tablet", "accessory", "other"]).optional(), condition: z.enum(["new", "refurbished", "used_good", "used_fair"]).optional(), maxPriceCents: z.coerce.number().int().nonnegative().optional(), pagina: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });
const countryQuerySchema = z.object({ countryCode: z.string().regex(/^[A-Z]{2}$/) });
const provinceQuerySchema = z.object({ provinceCode: z.string().regex(/^[A-Z0-9]{1,2}$/) });

type ControllerReply = { code(statusCode: number): ControllerReply; header(name: string, value: string): ControllerReply; send(payload: unknown): unknown };

@Controller("/api/shop")
export class ShopController {
  @InjectDataSource() private readonly dataSource!: DataSource;
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get("/address-catalog/countries")
  listAddressCountries(): Promise<unknown> {
    return this.dataSource.query('SELECT code, name, code = \'ES\' AS "postalCoverage" FROM address_countries ORDER BY name');
  }

  @Get("/address-catalog/provinces")
  listAddressProvinces(@Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> | unknown {
    const parsed = countryQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid country code" });
    return this.dataSource.query('SELECT code, name FROM address_provinces WHERE country_code = $1 ORDER BY name', [parsed.data.countryCode]);
  }

  @Get("/address-catalog/places")
  listAddressPlaces(@Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> | unknown {
    const parsed = provinceQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid province code" });
    return this.dataSource.query('SELECT city, postal_code AS "postalCode" FROM address_postal_places WHERE province_code = $1 ORDER BY city, postal_code', [parsed.data.provinceCode]);
  }

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

  @Post("/register/request")
  async requestRegistration(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = registrationRequestSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid registration email", issues: parsed.error.flatten() });
    await this.commandBus.execute(new RequestShopRegistrationVerificationCommand(parsed.data.email));
    return reply.code(202).send({ message: "Si la dirección puede registrarse, recibirás un correo con los siguientes pasos." });
  }

  @Get("/register/verify/:token")
  async verifyRegistration(@Param("token") token: string, @Res() reply: ControllerReply): Promise<unknown> {
    const email = await this.queryBus.execute(new GetShopRegistrationVerificationQuery(token));
    return email ? { email } : reply.code(400).send({ message: "El enlace de verificación no es válido o ha caducado." });
  }

  @Post("/register/verify/:token")
  async completeRegistration(@Param("token") token: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = registrationCompletionSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid shop registration", issues: parsed.error.flatten() });
    const { useContactAddressForBilling, ...input } = parsed.data;
    const billingAddress = useContactAddressForBilling ? {
      billingAddressStreet: input.addressStreet,
      billingAddressPostalCode: input.addressPostalCode,
      billingAddressCity: input.addressCity,
      billingAddressProvince: input.addressProvince,
      billingAddressCountry: input.addressCountry
    } : {};
    try {
      const customer = await this.commandBus.execute(new RegisterShopCustomerCommand({ ...input, ...billingAddress }, request.ip ?? null, token));
      return reply.code(201).send(customer);
    } catch (error) {
      if (error instanceof ShopRegistrationEmailTakenError) return reply.code(409).send({ message: error.message });
      if (error instanceof ShopRegistrationPasswordError) return reply.code(400).send({ message: error.message });
      if (error instanceof ShopRegistrationVerificationInvalidError) return reply.code(400).send({ message: "El enlace de verificación no es válido o ha caducado." });
      throw error;
    }
  }
}
