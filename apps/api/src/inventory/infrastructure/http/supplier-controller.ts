import { Body, Controller, Get, Post, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { CreateSupplierCommand, ListSuppliersQuery } from "../../application/cqrs/supplier-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };
const supplierSchema = z.object({ name: z.string().trim().min(1).max(180), email: z.string().trim().email().max(320).optional(), phone: z.string().trim().max(64).optional(), notes: z.string().trim().max(2000).optional() });

@Authenticated()
@Controller("/api/inventory/suppliers")
export class SupplierController {
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  list(): Promise<unknown> { return this.queryBus.execute(new ListSuppliersQuery()); }

  @Post()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async create(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid supplier", issues: parsed.error.flatten() });
    return reply.code(201).send(await this.commandBus.execute(new CreateSupplierCommand(parsed.data)));
  }
}
