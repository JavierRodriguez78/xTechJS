import type { FastifyRequest } from "fastify";
import { Body, Controller, Get, Param, Patch, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { AdjustInventoryStockCommand, ConsumeInventoryForRepairCommand, CreateInventoryItemCommand, GetInventoryMovementsQuery, ListInventoryItemsQuery, ListLowStockItemsQuery } from "../../application/cqrs/inventory-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";
import { TransferStock } from "../../application/transfer-stock.js";

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };
const createSchema = z.object({ sku: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(180), description: z.string().trim().max(2000).optional(), unit: z.string().trim().max(32).optional(), minimumStock: z.number().int().min(0).max(1000000).optional(), salePriceCents: z.number().int().min(0).max(100000000).optional(), taxRate: z.number().min(0).max(100).optional() });
const adjustmentSchema = z.object({ storeId: z.string().uuid().optional(), quantity: z.number().int().min(-1000000).max(1000000).refine((value) => value !== 0), type: z.enum(["receipt", "adjustment", "consumption"]), note: z.string().trim().max(500).optional() });
const consumptionSchema = z.object({ repairOrderId: z.string().uuid(), quantity: z.number().int().positive().max(1000000), note: z.string().trim().max(500).optional() });
const transferSchema = z.object({ originStoreId: z.string().uuid(), destinationStoreId: z.string().uuid(), note: z.string().trim().max(500).optional(), lines: z.array(z.object({ inventoryItemId: z.string().uuid(), quantity: z.number().int().positive().max(1000000) })).min(1).max(100) });
const storeQuerySchema = z.object({ storeId: z.string().uuid().optional() });

@Authenticated()
@Controller("/api/inventory")
export class InventoryController {
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus, private readonly transferStock: TransferStock) {}

  @Get()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  list(@Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> { const storeId = (request.user as AuthTokenPayload).storeId ?? storeQuerySchema.parse(request.query).storeId; return storeId ? this.queryBus.execute(new ListInventoryItemsQuery(storeId)) : Promise.resolve(reply.code(400).send({ message: "Selecciona una tienda para el inventario." })); }

  @Get("/alerts/low-stock")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  lowStock(@Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> { const storeId = (request.user as AuthTokenPayload).storeId ?? storeQuerySchema.parse(request.query).storeId; return storeId ? this.queryBus.execute(new ListLowStockItemsQuery(storeId)) : Promise.resolve(reply.code(400).send({ message: "Selecciona una tienda para las alertas." })); }

  @Post()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async create(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid inventory item", issues: parsed.error.flatten() });
    return reply.code(201).send(await this.commandBus.execute(new CreateInventoryItemCommand(parsed.data)));
  }

  @Patch("/:id/stock")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async adjust(@Param("id") id: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid inventory adjustment", issues: parsed.error.flatten() });
    try {
      const user = request.user as AuthTokenPayload;
      const storeId = user.storeId ?? parsed.data.storeId;
      if (!storeId) return reply.code(400).send({ message: "Selecciona una tienda para el ajuste." });
      const { storeId: _, ...input } = parsed.data;
      const item = await this.commandBus.execute(new AdjustInventoryStockCommand(storeId, id, input));
      return item ? item : reply.code(404).send({ message: "Inventory item not found" });
    } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  @Post("/:id/consume")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async consume(@Param("id") inventoryItemId: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = consumptionSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid inventory consumption", issues: parsed.error.flatten() });
    try {
      const item = await this.commandBus.execute(new ConsumeInventoryForRepairCommand(parsed.data.repairOrderId, inventoryItemId, parsed.data.quantity, parsed.data.note));
      return item ? item : reply.code(404).send({ message: "Inventory item not found" });
    } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  @Post("/transfers")
  @PermissionRequired(PERMISSIONS.inventoryTransfer)
  async transfer(@Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid stock transfer", issues: parsed.error.flatten() });
    const user = request.user as AuthTokenPayload;
    if (user.storeId && user.storeId !== parsed.data.originStoreId) return reply.code(403).send({ message: "You can only transfer stock from your store" });
    try { return reply.code(201).send(await this.transferStock.execute(parsed.data, user.sub)); }
    catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }

  @Get("/transfers")
  @PermissionRequired(PERMISSIONS.inventoryTransfer)
  listTransfers(@Req() request: FastifyRequest): Promise<unknown> { const user = request.user as AuthTokenPayload; return this.transferStock.list(user.storeId ?? storeQuerySchema.parse(request.query).storeId ?? null); }

  @Post("/transfers/:id/send")
  @PermissionRequired(PERMISSIONS.inventoryTransfer)
  async sendTransfer(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> { try { return await this.transferStock.send(id, (request.user as AuthTokenPayload).storeId); } catch (error) { return reply.code(409).send({ message: (error as Error).message }); } }

  @Post("/transfers/:id/receive")
  @PermissionRequired(PERMISSIONS.inventoryTransfer)
  async receiveTransfer(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> { try { return await this.transferStock.receive(id, (request.user as AuthTokenPayload).storeId); } catch (error) { return reply.code(409).send({ message: (error as Error).message }); } }

  @Post("/transfers/:id/cancel")
  @PermissionRequired(PERMISSIONS.inventoryTransfer)
  async cancelTransfer(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> { try { return await this.transferStock.cancel(id, (request.user as AuthTokenPayload).storeId); } catch (error) { return reply.code(409).send({ message: (error as Error).message }); } }

  @Get("/:id/movements")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  movements(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> { const storeId = (request.user as AuthTokenPayload).storeId ?? storeQuerySchema.parse(request.query).storeId; return storeId ? this.queryBus.execute(new GetInventoryMovementsQuery(storeId, id)) : Promise.resolve(reply.code(400).send({ message: "Selecciona una tienda para los movimientos." })); }
}
