import { Body, Controller, Get, Param, Patch, Post, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { AdjustInventoryStockCommand, ConsumeInventoryForRepairCommand, CreateInventoryItemCommand, GetInventoryMovementsQuery, ListInventoryItemsQuery, ListLowStockItemsQuery } from "../../application/cqrs/inventory-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };
const createSchema = z.object({ sku: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(180), description: z.string().trim().max(2000).optional(), unit: z.string().trim().max(32).optional(), minimumStock: z.number().int().min(0).max(1000000).optional() });
const adjustmentSchema = z.object({ quantity: z.number().int().min(-1000000).max(1000000).refine((value) => value !== 0), type: z.enum(["receipt", "adjustment", "consumption"]), note: z.string().trim().max(500).optional() });
const consumptionSchema = z.object({ repairOrderId: z.string().uuid(), quantity: z.number().int().positive().max(1000000), note: z.string().trim().max(500).optional() });

@Authenticated()
@Controller("/api/inventory")
export class InventoryController {
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  list(): Promise<unknown> { return this.queryBus.execute(new ListInventoryItemsQuery()); }

  @Get("/alerts/low-stock")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  lowStock(): Promise<unknown> { return this.queryBus.execute(new ListLowStockItemsQuery()); }

  @Post()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async create(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid inventory item", issues: parsed.error.flatten() });
    return reply.code(201).send(await this.commandBus.execute(new CreateInventoryItemCommand(parsed.data)));
  }

  @Patch("/:id/stock")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async adjust(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid inventory adjustment", issues: parsed.error.flatten() });
    try {
      const item = await this.commandBus.execute(new AdjustInventoryStockCommand(id, parsed.data));
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

  @Get("/:id/movements")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  movements(@Param("id") id: string): Promise<unknown> { return this.queryBus.execute(new GetInventoryMovementsQuery(id)); }
}
