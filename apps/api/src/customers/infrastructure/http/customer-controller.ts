import { Body, Controller, Get, Param, Patch, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { InjectDataSource, type DataSource } from "@xtaskjs/typeorm";
import { IsNull } from "typeorm";
import { compare, hash } from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import type { CreateCustomerInput, UpdateCustomerInput } from "../../domain/customer.js";
import { CreateCustomerCommand, GetCustomerQuery, ListCustomerCommunicationsQuery, ListCustomerRepairsQuery, ListCustomersQuery, ResendCustomerInvitationCommand, UpdateCustomerCommand } from "../../application/cqrs/customer-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import { UserEntitySchema } from "../../../users/infrastructure/persistence/user-entity.js";
import { CustomerEntitySchema } from "../persistence/customer-entity.js";
import { CustomerRegistrationTokenEntitySchema } from "../persistence/customer-registration-token-entity.js";
import { DataProtectionConsentEntitySchema } from "../persistence/data-protection-consent-entity.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";

const createCustomerSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(64).optional(),
  addressStreet: z.string().trim().max(500).optional(),
  addressPostalCode: z.string().trim().max(20).optional(),
  addressCity: z.string().trim().max(120).optional(),
  addressProvince: z.string().trim().max(120).optional(),
  addressCountry: z.string().trim().max(120).optional(),
  taxId: z.string().trim().max(64).optional(),
  customerType: z.enum(["individual", "business"]).optional(),
  internalNotes: z.string().trim().max(5000).optional(),
  billingName: z.string().trim().max(160).optional(),
  billingTaxId: z.string().trim().max(64).optional(),
  billingAddressStreet: z.string().trim().max(500).optional(),
  billingAddressPostalCode: z.string().trim().max(20).optional(),
  billingAddressCity: z.string().trim().max(120).optional(),
  billingAddressProvince: z.string().trim().max(120).optional(),
  billingAddressCountry: z.string().trim().max(120).optional(),
  useContactAddressForBilling: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(20).optional()
});

const completeRegistrationSchema = z.object({
  password: z.string().min(12).max(256),
  displayName: z.string().trim().min(1).max(160).optional(),
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

const updateCustomerSchema = createCustomerSchema.partial().refine((input) => Object.keys(input).length > 0, "At least one field is required");
const listCustomersQuerySchema = z.object({
  q: z.string().trim().min(1).max(160).optional(),
  estado: z.enum(["pending", "completed"]).optional(),
  etiqueta: z.string().trim().min(1).max(64).optional(),
  desde: z.string().date().optional(),
  hasta: z.string().date().optional(),
  orden: z.enum(["displayName:asc", "displayName:desc", "createdAt:asc", "createdAt:desc"]).default("createdAt:desc"),
  pagina: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };

@Controller("/api/customers")
export class CustomerController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectCommandBus() private readonly commandBus: CommandBus,
    @InjectQueryBus() private readonly queryBus: QueryBus
  ) {}

  @Get("/register/:token")
  async getCustomerRegistration(@Param("token") token: string, @Res() reply: ControllerReply): Promise<unknown> {
    const customer = await this.resolveRegistrationToken(token);
    if (!customer) {
      return reply.code(400).send({ message: "Invalid or expired registration token" });
    }
    return {
      customerId: customer.id,
      email: customer.email,
      displayName: customer.displayName,
      phone: customer.phone,
      taxId: customer.taxId,
      customerType: customer.customerType,
      address: customer.address,
      addressStreet: customer.addressStreet,
      addressPostalCode: customer.addressPostalCode,
      addressCity: customer.addressCity,
      addressProvince: customer.addressProvince,
      addressCountry: customer.addressCountry,
      billingName: customer.billingName,
      billingTaxId: customer.billingTaxId,
      billingAddressStreet: customer.billingAddressStreet,
      billingAddressPostalCode: customer.billingAddressPostalCode,
      billingAddressCity: customer.billingAddressCity,
      billingAddressProvince: customer.billingAddressProvince,
      billingAddressCountry: customer.billingAddressCountry
    };
  }

  @Post("/register/:token")
  async completeCustomerRegistration(@Param("token") token: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = completeRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid registration data", issues: parsed.error.flatten() });
    }

    const tokenRecord = await this.findValidRegistrationToken(token);
    if (!tokenRecord) return reply.code(400).send({ message: "Invalid or expired registration token" });

    const passwordHash = await hash(parsed.data.password, 12);
    const result = await this.dataSource.transaction(async (manager) => {
      const tokenRepository = manager.getRepository(CustomerRegistrationTokenEntitySchema);
      const lockedToken = await tokenRepository.findOne({ where: { id: tokenRecord.id, usedAt: IsNull() }, lock: { mode: "pessimistic_write" } });
      if (!lockedToken || lockedToken.expiresAt.getTime() <= Date.now()) return { error: "Invalid or expired registration token" };
      const customerRepository = manager.getRepository(CustomerEntitySchema);
      const customer = await customerRepository.findOneBy({ id: lockedToken.customerId });
      if (!customer?.email) return { error: "Customer not found" };

      const contact = {
        addressStreet: parsed.data.addressStreet ?? customer.addressStreet,
        addressPostalCode: parsed.data.addressPostalCode ?? customer.addressPostalCode,
        addressCity: parsed.data.addressCity ?? customer.addressCity,
        addressProvince: parsed.data.addressProvince ?? customer.addressProvince,
        addressCountry: parsed.data.addressCountry ?? customer.addressCountry
      };
      const billing = parsed.data.useContactAddressForBilling ? {
        billingAddressStreet: contact.addressStreet,
        billingAddressPostalCode: contact.addressPostalCode,
        billingAddressCity: contact.addressCity,
        billingAddressProvince: contact.addressProvince,
        billingAddressCountry: contact.addressCountry
      } : {
        billingAddressStreet: parsed.data.billingAddressStreet ?? customer.billingAddressStreet,
        billingAddressPostalCode: parsed.data.billingAddressPostalCode ?? customer.billingAddressPostalCode,
        billingAddressCity: parsed.data.billingAddressCity ?? customer.billingAddressCity,
        billingAddressProvince: parsed.data.billingAddressProvince ?? customer.billingAddressProvince,
        billingAddressCountry: parsed.data.billingAddressCountry ?? customer.billingAddressCountry
      };
      const completedData = {
        billingName: parsed.data.billingName ?? customer.billingName,
        billingTaxId: parsed.data.billingTaxId ?? customer.billingTaxId ?? customer.taxId,
        ...billing
      };
      const requiredBillingFields: (keyof typeof completedData)[] = ["billingName", "billingTaxId", "billingAddressStreet", "billingAddressPostalCode", "billingAddressCity", "billingAddressProvince", "billingAddressCountry"];
      const missingBillingFields = requiredBillingFields.filter((field) => !completedData[field]?.trim());
      if (missingBillingFields.length) return { error: "Completa los datos de facturación obligatorios antes de terminar el registro.", fields: missingBillingFields };

      const displayName = parsed.data.displayName ?? customer.displayName;
      const phone = parsed.data.phone ?? customer.phone;
      await manager.getRepository(UserEntitySchema).save({ id: customer.id, email: customer.email, displayName, role: "customer", active: true, passwordHash });
      await customerRepository.update(customer.id, {
        displayName,
        phone,
        taxId: parsed.data.taxId?.trim().toUpperCase() ?? customer.taxId,
        customerType: parsed.data.customerType ?? customer.customerType,
        ...contact,
        ...completedData,
        registrationStatus: "completed"
      });
      await manager.getRepository(DataProtectionConsentEntitySchema).save({
        id: randomUUID(),
        customerId: customer.id,
        consentText: parsed.data.consentText,
        consentVersion: createHash("sha256").update(parsed.data.consentText).digest("hex"),
        acceptedAt: new Date(),
        ipAddress: request.ip ?? null
      });
      await tokenRepository.update(lockedToken.id, { usedAt: new Date() });
      return { message: "Registration completed successfully" };
    });
    if ("error" in result) return reply.code(result.error === "Customer not found" ? 404 : 400).send({ message: result.error, fields: "fields" in result ? result.fields : undefined });
    return result;
  }

  @Get()
  @PermissionRequired(PERMISSIONS.customersRead)
  @Authenticated()
  async listCustomers(@Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = listCustomersQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid customer list query", issues: parsed.error.flatten() });
    const { q, estado, etiqueta, desde, hasta, orden, pagina, pageSize } = parsed.data;
    const createdTo = hasta ? new Date(`${hasta}T00:00:00.000Z`) : undefined;
    if (createdTo) createdTo.setUTCDate(createdTo.getUTCDate() + 1);
    return this.queryBus.execute(new ListCustomersQuery({
      query: q,
      registrationStatus: estado,
      tag: etiqueta,
      createdFrom: desde ? new Date(`${desde}T00:00:00.000Z`) : undefined,
      createdTo,
      sort: orden,
      page: pagina,
      pageSize
    }));
  }

  @Get("/me")
  @Authenticated()
  async getOwnCustomer(@Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const user = request.user as AuthTokenPayload;
    if (user.role !== "customer") return reply.code(403).send({ message: "Customer access required" });
    const customer = await this.dataSource.getRepository(CustomerEntitySchema).findOneBy({ id: user.sub });
    if (!customer) return reply.code(404).send({ message: "Customer not found" });
    const { id, displayName, email, phone, taxId, customerType, address, addressStreet, addressPostalCode, addressCity, addressProvince, addressCountry, billingName, billingTaxId, billingAddressStreet, billingAddressPostalCode, billingAddressCity, billingAddressProvince, billingAddressCountry } = customer;
    return { id, displayName, email, phone, taxId, customerType, address, addressStreet, addressPostalCode, addressCity, addressProvince, addressCountry, billingName, billingTaxId, billingAddressStreet, billingAddressPostalCode, billingAddressCity, billingAddressProvince, billingAddressCountry };
  }

  @Get("/:id")
  @PermissionRequired(PERMISSIONS.customersRead)
  @Authenticated()
  async getCustomer(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const customer = await this.queryBus.execute(new GetCustomerQuery(id));
    return customer ? customer : reply.code(404).send({ message: "Customer not found" });
  }

  @Get("/:id/repairs")
  @PermissionRequired(PERMISSIONS.customersRead)
  @Authenticated()
  listCustomerRepairs(@Param("id") id: string): Promise<unknown> {
    return this.queryBus.execute(new ListCustomerRepairsQuery(id));
  }

  @Get("/:id/communications")
  @PermissionRequired(PERMISSIONS.customersRead)
  @Authenticated()
  listCustomerCommunications(@Param("id") id: string): Promise<unknown> {
    return this.queryBus.execute(new ListCustomerCommunicationsQuery(id));
  }

  @Post()
  @PermissionRequired(PERMISSIONS.customersManage)
  @Authenticated()
  async createCustomer(@Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = createCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid customer data", issues: parsed.error.flatten() });
    }
    const user = request.user as AuthTokenPayload;
    const { useContactAddressForBilling, ...input } = parsed.data;
    const billingAddress = useContactAddressForBilling ? {
      billingAddressStreet: input.addressStreet,
      billingAddressPostalCode: input.addressPostalCode,
      billingAddressCity: input.addressCity,
      billingAddressProvince: input.addressProvince,
      billingAddressCountry: input.addressCountry
    } : {};
    const customer = await this.commandBus.execute(new CreateCustomerCommand({ ...input, ...billingAddress, originStoreId: user.defaultStoreId ?? user.storeId ?? null } as CreateCustomerInput));
    return reply.code(201).send(customer);
  }

  @Patch("/:id")
  @PermissionRequired(PERMISSIONS.customersManage)
  @Authenticated()
  async updateCustomer(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid customer data", issues: parsed.error.flatten() });
    }
    const { useContactAddressForBilling, ...input } = parsed.data;
    let updateInput: UpdateCustomerInput = input as UpdateCustomerInput;
    if (useContactAddressForBilling) {
      const current = await this.queryBus.execute(new GetCustomerQuery(id));
      if (!current) return reply.code(404).send({ message: "Customer not found" });
      updateInput = {
        ...updateInput,
        billingAddressStreet: input.addressStreet ?? current.addressStreet ?? undefined,
        billingAddressPostalCode: input.addressPostalCode ?? current.addressPostalCode ?? undefined,
        billingAddressCity: input.addressCity ?? current.addressCity ?? undefined,
        billingAddressProvince: input.addressProvince ?? current.addressProvince ?? undefined,
        billingAddressCountry: input.addressCountry ?? current.addressCountry ?? undefined
      };
    }
    const customer = await this.commandBus.execute(new UpdateCustomerCommand(id, updateInput));
    return customer ? customer : reply.code(404).send({ message: "Customer not found" });
  }

  @Post("/:id/resend-invitation")
  @PermissionRequired(PERMISSIONS.customersManage)
  @Authenticated()
  async resendInvitation(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    try {
      const customer = await this.commandBus.execute(new ResendCustomerInvitationCommand(id));
      return reply.code(200).send({ message: "Invitation sent", customer });
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes("not found")) {
        return reply.code(404).send({ message });
      }
      if (message.includes("email")) {
        return reply.code(400).send({ message });
      }
      return reply.code(409).send({ message });
    }
  }

  private async findValidRegistrationToken(token: string) {
    const repository = this.dataSource.getRepository(CustomerRegistrationTokenEntitySchema);
    const records = await repository.find({ where: { usedAt: IsNull() }, order: { createdAt: "DESC" } });
    for (const record of records) {
      if (record.expiresAt.getTime() <= Date.now()) continue;
      if (await compare(token, record.tokenHash)) {
        return record;
      }
    }
    return undefined;
  }

  private async resolveRegistrationToken(token: string) {
    const validRecord = await this.findValidRegistrationToken(token);
    if (!validRecord) return undefined;
    return this.dataSource.getRepository(CustomerEntitySchema).findOneBy({ id: validRecord.customerId });
  }
}
