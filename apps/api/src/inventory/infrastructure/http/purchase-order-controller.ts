import { Body, Controller, Get, Param, Post, Req, Res } from "@xtaskjs/common";
import type { FastifyRequest } from "fastify";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { z } from "zod";
import { CreatePurchaseOrderCommand, ListPurchaseOrdersQuery, ReceivePurchaseOrderCommand } from "../../application/cqrs/purchase-order-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";
import { canAccessStore, getStoreAccess } from "../../../users/domain/store-access.js";

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };
const lineSchema = z.object({ inventoryItemId: z.string().uuid(), quantity: z.number().int().positive().max(1000000), unitCostCents: z.number().int().min(0).max(100000000) });
const createSchema = z.object({ supplierId: z.string().uuid(), storeId: z.string().uuid().optional(), lines: z.array(lineSchema).min(1).max(100) });

@Authenticated()
@Controller("/api/inventory/purchase-orders")
export class PurchaseOrderController {
  @InjectDataSource() private readonly dataSource!: DataSource;
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  list(@Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> | unknown {
    const parsed = z.object({ storeId: z.string().uuid().optional() }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: "Selecciona una tienda valida." });
    const user = request.user as AuthTokenPayload;
    if (parsed.data.storeId && !canAccessStore(user, parsed.data.storeId)) return reply.code(403).send({ message: "No tienes acceso a la tienda seleccionada." });
    const access = parsed.data.storeId ? [parsed.data.storeId] : getStoreAccess(user);
    return this.queryBus.execute(new ListPurchaseOrdersQuery(access));
  }

  @Post()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async create(@Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid purchase order", issues: parsed.error.flatten() });
    const user = request.user as AuthTokenPayload;
    const access = getStoreAccess(user);
    const storeId = parsed.data.storeId ?? user.defaultStoreId ?? user.storeId ?? (access?.length === 1 ? access[0] : undefined);
    if (!storeId) return reply.code(400).send({ message: "Selecciona una tienda para el pedido de compra." });
    if (!canAccessStore(user, storeId)) return reply.code(403).send({ message: "No tienes acceso a la tienda seleccionada." });
    const stores: Array<{ id: string }> = await this.dataSource.query('SELECT id FROM stores WHERE id = $1 AND active = true', [storeId]);
    if (!stores.length) return reply.code(400).send({ message: "La tienda seleccionada no existe o esta inactiva." });
    return reply.code(201).send(await this.commandBus.execute(new CreatePurchaseOrderCommand({ ...parsed.data, storeId })));
  }

  @Post("/:id/receive")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async receive(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    try {
      const order = await this.commandBus.execute(new ReceivePurchaseOrderCommand(id, getStoreAccess(request.user as AuthTokenPayload)));
      return order ? order : reply.code(404).send({ message: "Purchase order not found" });
    } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }
}
