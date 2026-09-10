import { Body, Controller, Get, Param, Post, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { CreatePurchaseOrderCommand, ListPurchaseOrdersQuery, ReceivePurchaseOrderCommand } from "../../application/cqrs/purchase-order-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";

type ControllerReply = { code(statusCode: number): { send(payload: unknown): unknown } };
const lineSchema = z.object({ inventoryItemId: z.string().uuid(), quantity: z.number().int().positive().max(1000000), unitCostCents: z.number().int().min(0).max(100000000) });
const createSchema = z.object({ supplierId: z.string().uuid(), lines: z.array(lineSchema).min(1).max(100) });

@Authenticated()
@Controller("/api/inventory/purchase-orders")
export class PurchaseOrderController {
  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  list(): Promise<unknown> { return this.queryBus.execute(new ListPurchaseOrdersQuery()); }

  @Post()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async create(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid purchase order", issues: parsed.error.flatten() });
    return reply.code(201).send(await this.commandBus.execute(new CreatePurchaseOrderCommand(parsed.data)));
  }

  @Post("/:id/receive")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async receive(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    try {
      const order = await this.commandBus.execute(new ReceivePurchaseOrderCommand(id));
      return order ? order : reply.code(404).send({ message: "Purchase order not found" });
    } catch (error) { return reply.code(409).send({ message: (error as Error).message }); }
  }
}
