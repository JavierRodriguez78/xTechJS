import type { FastifyRequest } from "fastify";
import { Body, Controller, Get, Param, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, InjectQueryBus, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { Authenticated } from "@xtaskjs/security";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { z } from "zod";
import { CreatePurchaseOrderCommand } from "../../application/cqrs/purchase-order-messages.js";
import { CreateInventoryItemFromSupplierCatalogCommand, GetSupplierCatalogItemQuery, LinkSupplierCatalogItemCommand, ListSupplierCatalogQuery } from "../../application/cqrs/supplier-catalog-messages.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { canAccessStore, getStoreAccess } from "../../../users/domain/store-access.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";

const listSchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  supplierId: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(120).optional(),
  brand: z.string().trim().min(1).max(120).optional(),
  model: z.string().trim().min(1).max(120).optional(),
  availability: z.enum(["in_stock", "out_of_stock", "unknown"]).optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
}).refine((value) => value.priceMin === undefined || value.priceMax === undefined || value.priceMin <= value.priceMax, { message: "El precio mínimo no puede superar el máximo." });
const linkSchema = z.object({ inventoryItemId: z.string().uuid() });
const createItemSchema = z.object({ sku: z.string().trim().min(1).max(80).optional() });
const purchaseOrderSchema = z.object({ storeId: z.string().uuid(), quantity: z.number().int().positive().max(1000000) });

type ControllerReply = { code(statusCode: number): ControllerReply; send(payload: unknown): unknown };

@Authenticated()
@Controller("/api/inventory/catalog")
export class SupplierCatalogController {
  @InjectDataSource() private readonly dataSource!: DataSource;

  constructor(@InjectCommandBus() private readonly commandBus: CommandBus, @InjectQueryBus() private readonly queryBus: QueryBus) {}

  @Get()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async list(@Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = listSchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid supplier catalog query", issues: parsed.error.flatten() });
    const { q, supplierId, category, brand, model, availability, priceMin, priceMax, pagina, pageSize } = parsed.data;
    return this.queryBus.execute(new ListSupplierCatalogQuery({ query: q, supplierId, category, brand, model, availability, priceMin, priceMax, page: pagina, pageSize }));
  }

  @Get("/:id")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async get(@Param("id") id: string, @Res() reply: ControllerReply): Promise<unknown> {
    const item = await this.queryBus.execute(new GetSupplierCatalogItemQuery(id));
    return item ?? reply.code(404).send({ message: "Catalog item not found" });
  }

  @Post("/:id/link-inventory-item")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async link(@Param("id") id: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid inventory item link", issues: parsed.error.flatten() });
    const user = request.user as AuthTokenPayload;
    if (!await this.canAccessInventoryItem(parsed.data.inventoryItemId, user)) return reply.code(404).send({ message: "Inventory item not found" });
    const linked = await this.commandBus.execute(new LinkSupplierCatalogItemCommand(id, parsed.data.inventoryItemId));
    return linked ?? reply.code(404).send({ message: "Catalog item not found" });
  }

  @Post("/:id/create-inventory-item")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async createInventoryItem(@Param("id") id: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid inventory item", issues: parsed.error.flatten() });
    const user = request.user as AuthTokenPayload;
    const storeIds = getStoreAccess(user);
    if (storeIds?.length === 0) return reply.code(403).send({ message: "No tienes tiendas asignadas." });
    const created = await this.commandBus.execute(new CreateInventoryItemFromSupplierCatalogCommand(id, parsed.data.sku, storeIds));
    if (!created) return reply.code(404).send({ message: "Catalog item not found" });
    if (!await this.canAccessInventoryItem(created.inventoryItem.id, user)) return reply.code(404).send({ message: "Inventory item not found" });
    return reply.code(201).send(created);
  }

  @Post("/:id/purchase-order")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async createPurchaseOrder(@Param("id") id: string, @Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = purchaseOrderSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid purchase order", issues: parsed.error.flatten() });
    const user = request.user as AuthTokenPayload;
    if (!canAccessStore(user, parsed.data.storeId)) return reply.code(403).send({ message: "No tienes acceso a la tienda seleccionada." });
    const stores: Array<{ id: string }> = await this.dataSource.query('SELECT id FROM stores WHERE id = $1 AND active = true', [parsed.data.storeId]);
    if (!stores.length) return reply.code(400).send({ message: "La tienda seleccionada no existe o esta inactiva." });
    const catalogItem = await this.queryBus.execute(new GetSupplierCatalogItemQuery(id));
    if (!catalogItem) return reply.code(404).send({ message: "Catalog item not found" });
    if (!catalogItem.inventoryItemId) return reply.code(409).send({ message: "Vincula o crea el artículo de inventario antes de generar el pedido." });
    if (!await this.canAccessInventoryItem(catalogItem.inventoryItemId, user, parsed.data.storeId)) return reply.code(404).send({ message: "Inventory item not found" });
    return reply.code(201).send(await this.commandBus.execute(new CreatePurchaseOrderCommand({
      supplierId: catalogItem.supplierId,
      storeId: parsed.data.storeId,
      lines: [{ inventoryItemId: catalogItem.inventoryItemId, quantity: parsed.data.quantity, unitCostCents: catalogItem.priceCents }]
    })));
  }

  private async canAccessInventoryItem(id: string, user: AuthTokenPayload, storeId?: string): Promise<boolean> {
    const access = getStoreAccess(user);
    if (storeId && !canAccessStore(user, storeId)) return false;
    if (access === null) return true;
    if (!access.length) return false;
    const storeIds = storeId ? [storeId] : access;
    const rows: unknown[] = await this.dataSource.query('SELECT 1 FROM store_inventory_stock WHERE inventory_item_id = $1 AND store_id = ANY($2::uuid[]) LIMIT 1', [id, storeIds]);
    return rows.length > 0;
  }
}
