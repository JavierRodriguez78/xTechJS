import { Body, Controller, Get, Param, Patch, Post, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import type { CreateCustomerInput, UpdateCustomerInput } from "../../domain/customer.js";
import { CreateCustomerCommand, GetCustomerQuery, ListCustomerRepairsQuery, ListCustomersQuery, UpdateCustomerCommand } from "../../application/cqrs/customer-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";

const createCustomerSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().max(64).optional(),
  address: z.string().trim().max(1000).optional(),
  taxId: z.string().trim().max(64).optional(),
  internalNotes: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(20).optional()
});

const updateCustomerSchema = createCustomerSchema.partial().refine((input) => Object.keys(input).length > 0, "At least one field is required");

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };

@Authenticated()
@Controller("/api/customers")
export class CustomerController {
  constructor(
    @InjectCommandBus() private readonly commandBus: CommandBus,
    @InjectQueryBus() private readonly queryBus: QueryBus
  ) {}

  @Get()
  @PermissionRequired(PERMISSIONS.customersRead)
  listCustomers(): Promise<unknown> {
    return this.queryBus.execute(new ListCustomersQuery());
  }

  @Get("/:id")
  @PermissionRequired(PERMISSIONS.customersRead)
  async getCustomer(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const customer = await this.queryBus.execute(new GetCustomerQuery(id));
    return customer ? customer : reply.code(404).send({ message: "Customer not found" });
  }

  @Get("/:id/repairs")
  @PermissionRequired(PERMISSIONS.customersRead)
  listCustomerRepairs(@Param("id") id: string): Promise<unknown> {
    return this.queryBus.execute(new ListCustomerRepairsQuery(id));
  }

  @Post()
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
  @PermissionRequired(PERMISSIONS.customersManage)
  async updateCustomer(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid customer data", issues: parsed.error.flatten() });
    }
    const customer = await this.commandBus.execute(new UpdateCustomerCommand(id, parsed.data as UpdateCustomerInput));
    return customer ? customer : reply.code(404).send({ message: "Customer not found" });
  }
}
