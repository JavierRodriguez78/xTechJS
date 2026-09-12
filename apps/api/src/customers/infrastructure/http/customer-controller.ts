import { Body, Controller, Get, Param, Patch, Post, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { InjectDataSource, type DataSource } from "@xtaskjs/typeorm";
import { IsNull } from "typeorm";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import type { CreateCustomerInput, UpdateCustomerInput } from "../../domain/customer.js";
import { CreateCustomerCommand, GetCustomerQuery, ListCustomerRepairsQuery, ListCustomersQuery, UpdateCustomerCommand } from "../../application/cqrs/customer-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import { UserEntitySchema } from "../../../users/infrastructure/persistence/user-entity.js";
import { CustomerEntitySchema } from "../persistence/customer-entity.js";
import { CustomerRegistrationTokenEntitySchema } from "../persistence/customer-registration-token-entity.js";

const createCustomerSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(64).optional(),
  address: z.string().trim().max(1000).optional(),
  taxId: z.string().trim().max(64).optional(),
  internalNotes: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(20).optional()
});

const completeRegistrationSchema = z.object({
  password: z.string().min(12).max(256),
  billingName: z.string().trim().min(1).max(160),
  billingTaxId: z.string().trim().min(1).max(64),
  billingAddress: z.string().trim().min(1).max(500),
  billingPostalCode: z.string().trim().min(1).max(20),
  billingCity: z.string().trim().min(1).max(120),
  billingProvince: z.string().trim().min(1).max(120),
  consentAccepted: z.boolean().refine((value) => value === true, "Consent is required"),
  consentText: z.string().trim().min(1).max(5000)
});

const updateCustomerSchema = createCustomerSchema.partial().refine((input) => Object.keys(input).length > 0, "At least one field is required");

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
    return { customerId: customer.id, email: customer.email };
  }

  @Post("/register/:token")
  async completeCustomerRegistration(@Param("token") token: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = completeRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid registration data", issues: parsed.error.flatten() });
    }

    const tokenRecord = await this.findValidRegistrationToken(token);
    if (!tokenRecord) {
      return reply.code(400).send({ message: "Invalid or expired registration token" });
    }

    const customer = await this.dataSource.getRepository(CustomerEntitySchema).findOneBy({ id: tokenRecord.customerId });
    if (!customer || !customer.email) {
      return reply.code(404).send({ message: "Customer not found" });
    }

    const passwordHash = await hash(parsed.data.password, 12);
    await this.dataSource.getRepository(UserEntitySchema).save({
      id: customer.id,
      email: customer.email,
      displayName: customer.displayName,
      role: "customer",
      active: true,
      passwordHash
    });

    await this.dataSource.getRepository(CustomerEntitySchema).update(customer.id, {
      billingName: parsed.data.billingName,
      billingTaxId: parsed.data.billingTaxId,
      billingAddress: parsed.data.billingAddress,
      billingPostalCode: parsed.data.billingPostalCode,
      billingCity: parsed.data.billingCity,
      billingProvince: parsed.data.billingProvince,
      registrationStatus: "completed"
    });

    await this.dataSource.getRepository(CustomerRegistrationTokenEntitySchema).update(tokenRecord.id, { usedAt: new Date() });
    return { message: "Registration completed successfully" };
  }

  @Get()
  @Authenticated()
  @PermissionRequired(PERMISSIONS.customersRead)
  listCustomers(): Promise<unknown> {
    return this.queryBus.execute(new ListCustomersQuery());
  }

  @Get("/:id")
  @Authenticated()
  @PermissionRequired(PERMISSIONS.customersRead)
  async getCustomer(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const customer = await this.queryBus.execute(new GetCustomerQuery(id));
    return customer ? customer : reply.code(404).send({ message: "Customer not found" });
  }

  @Get("/:id/repairs")
  @Authenticated()
  @PermissionRequired(PERMISSIONS.customersRead)
  listCustomerRepairs(@Param("id") id: string): Promise<unknown> {
    return this.queryBus.execute(new ListCustomerRepairsQuery(id));
  }

  @Post()
  @Authenticated()
  @PermissionRequired(PERMISSIONS.customersManage)
  async createCustomer(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = createCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid customer data", issues: parsed.error.flatten() });
    }
    const customer = await this.commandBus.execute(new CreateCustomerCommand(parsed.data as CreateCustomerInput));
    return reply.code(201).send(customer);
  }

  @Patch("/:id")
  @Authenticated()
  @PermissionRequired(PERMISSIONS.customersManage)
  async updateCustomer(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid customer data", issues: parsed.error.flatten() });
    }
    const customer = await this.commandBus.execute(new UpdateCustomerCommand(id, parsed.data as UpdateCustomerInput));
    return customer ? customer : reply.code(404).send({ message: "Customer not found" });
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
