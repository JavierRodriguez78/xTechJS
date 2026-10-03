import type { FastifyRequest } from "fastify";
import { Body, Controller, Get, Param, Patch, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { CreateSupplierCommand, DeactivateSupplierCommand, GetSupplierQuery, ListSuppliersQuery, ReactivateSupplierCommand, UpdateSupplierCommand } from "../../application/cqrs/supplier-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const supplierSchema = z.object({ name: z.string().trim().min(1).max(180), email: z.string().trim().email().max(320).optional(), phone: z.string().trim().max(64).optional(), secondaryPhone: nullableText(64), notes: z.string().trim().max(2000).optional(), externalRef: z.string().trim().max(320).optional().nullable(), website: z.string().trim().url().max(2000).nullable().optional(), legalName: nullableText(200), taxId: nullableText(80), addressStreet: nullableText(500), addressPostalCode: nullableText(20), addressCity: nullableText(120), addressProvince: nullableText(120), addressCountry: nullableText(120), paymentTermDays: z.number().int().min(0).max(60).nullable().optional(), category: nullableText(120) });
const supplierUpdateSchema = supplierSchema.omit({ externalRef: true }).extend({ email: z.string().trim().email().max(320).nullable().optional(), phone: nullableText(64), notes: nullableText(2000) }).partial().refine((value) => Object.keys(value).length > 0);
const supplierListSchema = z.object({ q: z.string().trim().max(200).optional(), category: z.string().trim().max(120).optional(), active: z.enum(["true", "false"]).transform((value) => value === "true").optional() });

@Authenticated()
@Controller("/api/inventory/suppliers")
export class SupplierController {
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  list(@Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = supplierListSchema.safeParse(request.query);
    if (!parsed.success) return Promise.resolve(reply.code(400).send({ message: "Invalid supplier filters", issues: parsed.error.flatten() }));
    return this.queryBus.execute(new ListSuppliersQuery({ query: parsed.data.q, category: parsed.data.category, active: parsed.data.active }));
  }

  @Get("/:id")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async get(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const supplier = await this.queryBus.execute(new GetSupplierQuery(id));
    return supplier ?? reply.code(404).send({ message: "Supplier not found" });
  }

  @Post()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async create(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid supplier", issues: parsed.error.flatten() });
    return reply.code(201).send(await this.commandBus.execute(new CreateSupplierCommand(parsed.data)));
  }

  @Patch("/:id")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async update(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = supplierUpdateSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid supplier", issues: parsed.error.flatten() });
    const supplier = await this.commandBus.execute(new UpdateSupplierCommand(id, parsed.data));
    return supplier ?? reply.code(404).send({ message: "Supplier not found" });
  }

  @Post("/:id/deactivate")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async deactivate(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const supplier = await this.commandBus.execute(new DeactivateSupplierCommand(id));
    return supplier ?? reply.code(404).send({ message: "Supplier not found" });
  }

  @Post("/:id/reactivate")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async reactivate(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const supplier = await this.commandBus.execute(new ReactivateSupplierCommand(id));
    return supplier ?? reply.code(404).send({ message: "Supplier not found" });
  }
}
