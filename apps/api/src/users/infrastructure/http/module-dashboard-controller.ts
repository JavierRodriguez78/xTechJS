import type { FastifyRequest } from "fastify";
import { Controller, Get, Req, Res } from "@xtaskjs/common";
import { Authenticated } from "@xtaskjs/security";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { z } from "zod";
import { getStoreAccess } from "../../domain/store-access.js";
import { PERMISSIONS } from "../../domain/permission.js";
import { PermissionRequired } from "./permission-guard.js";
import type { AuthTokenPayload } from "./auth-routes.js";

const rangeSchema = z.object({ storeId: z.string().uuid().optional(), from: z.string().date().optional(), to: z.string().date().optional() });
type Reply = { code(status: number): { send(value: unknown): unknown } };
type Range = { storeIds: string[] | null; from: Date; to: Date };

@Authenticated()
@Controller("/api/admin/dashboard/overview")
export class ModuleDashboardController {
  @InjectDataSource() private readonly dataSource!: DataSource;

  @Get("/attention")
  @PermissionRequired(PERMISSIONS.customersRead)
  async attention(@Req() request: FastifyRequest, @Res() reply: Reply): Promise<unknown> {
    const range = this.resolveRange(request, reply);
    if (!range || range.storeIds?.length === 0) return range ? this.emptyAttention(range) : undefined;
    const repairStore = range.storeIds ? "AND r.store_id = ANY($3::uuid[])" : "";
    const customerStore = range.storeIds ? "AND origin_store_id = ANY($3::uuid[])" : "";
    const params = range.storeIds ? [range.from, range.to, range.storeIds] : [range.from, range.to];
    const [repairs, totals, customers, technicians] = await Promise.all([
      this.dataSource.query(`SELECT status, count(*)::int AS count FROM repair_orders r WHERE r.created_at BETWEEN $1 AND $2 ${repairStore} GROUP BY status ORDER BY count DESC`, params),
      this.dataSource.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status NOT IN ('repaired', 'delivered', 'cancelled', 'unrepairable'))::int AS in_progress, count(*) FILTER (WHERE status IN ('repaired', 'delivered'))::int AS finished FROM repair_orders r WHERE r.created_at BETWEEN $1 AND $2 ${repairStore}`, params),
      this.dataSource.query(`SELECT count(*)::int AS count FROM customers WHERE created_at BETWEEN $1 AND $2 ${customerStore}`, params),
      this.dataSource.query(`SELECT COALESCE(u.display_name, 'Sin asignar') AS name, count(*)::int AS count FROM repair_orders r LEFT JOIN users u ON u.id = r.technician_id WHERE r.created_at BETWEEN $1 AND $2 ${repairStore} GROUP BY u.display_name ORDER BY count DESC LIMIT 8`, params)
    ]);
    return { period: { from: range.from.toISOString(), to: range.to.toISOString() }, storeIds: range.storeIds, repairsByStatus: repairs, ...totals[0], newCustomers: customers[0]?.count ?? 0, technicians };
  }

  @Get("/inventory")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async inventory(@Req() request: FastifyRequest, @Res() reply: Reply): Promise<unknown> {
    const range = this.resolveRange(request, reply);
    if (!range || range.storeIds?.length === 0) return range ? this.emptyInventory(range) : undefined;
    const stockWhere = range.storeIds ? "WHERE store_id = ANY($1::uuid[])" : "";
    const movementWhere = range.storeIds ? "WHERE store_id = ANY($3::uuid[]) AND created_at BETWEEN $1 AND $2" : "WHERE created_at BETWEEN $1 AND $2";
    const params = range.storeIds ? [range.from, range.to, range.storeIds] : [range.from, range.to];
    const stockParams = range.storeIds ? [range.storeIds] : [];
    const [stock, itemCount, lowStock, movements, purchases] = await Promise.all([
      this.dataSource.query(`SELECT CASE WHEN stock = 0 THEN 'empty' WHEN stock <= minimum_stock THEN 'low' ELSE 'healthy' END AS status, count(*)::int AS count FROM store_inventory_stock ${stockWhere} GROUP BY status ORDER BY status`, stockParams),
      range.storeIds ? this.dataSource.query("SELECT count(DISTINCT inventory_item_id)::int AS count FROM store_inventory_stock WHERE store_id = ANY($1::uuid[])", stockParams) : this.dataSource.query("SELECT count(*)::int AS count FROM inventory_items"),
      range.storeIds ? this.dataSource.query("SELECT count(*)::int AS count FROM store_inventory_stock WHERE store_id = ANY($1::uuid[]) AND stock <= minimum_stock", stockParams) : this.dataSource.query("SELECT count(*)::int AS count FROM store_inventory_stock WHERE stock <= minimum_stock"),
      this.dataSource.query(`SELECT type, count(*)::int AS count FROM inventory_movements ${movementWhere} GROUP BY type ORDER BY count DESC`, params),
      range.storeIds ? this.dataSource.query("SELECT status, count(*)::int AS count FROM purchase_orders WHERE created_at BETWEEN $1 AND $2 AND store_id = ANY($3::uuid[]) GROUP BY status ORDER BY count DESC", [range.from, range.to, range.storeIds]) : this.dataSource.query("SELECT status, count(*)::int AS count FROM purchase_orders WHERE created_at BETWEEN $1 AND $2 GROUP BY status ORDER BY count DESC", [range.from, range.to])
    ]);
    return { period: { from: range.from.toISOString(), to: range.to.toISOString() }, storeIds: range.storeIds, inventoryItems: itemCount[0]?.count ?? 0, lowStock: lowStock[0]?.count ?? 0, stockPositionsByStatus: stock, movementsByType: movements, purchaseOrdersByStatus: purchases };
  }

  @Get("/sales")
  @PermissionRequired(PERMISSIONS.paymentsManage)
  async sales(@Req() request: FastifyRequest, @Res() reply: Reply): Promise<unknown> {
    const range = this.resolveRange(request, reply);
    if (!range || range.storeIds?.length === 0) return range ? this.emptySales(range) : undefined;
    const repairStore = range.storeIds ? "AND r.store_id = ANY($3::uuid[])" : "";
    const params = range.storeIds ? [range.from, range.to, range.storeIds] : [range.from, range.to];
    const [sales, byMethod, byDay, purchases] = await Promise.all([
      this.dataSource.query(`SELECT count(*) FILTER (WHERE p.status = 'paid')::int AS count, COALESCE(sum(p.amount_cents) FILTER (WHERE p.status = 'paid'), 0)::bigint AS cents, count(*) FILTER (WHERE p.status = 'refunded')::int AS refunded_count, COALESCE(sum(p.amount_cents) FILTER (WHERE p.status = 'refunded'), 0)::bigint AS refunded_cents FROM payments p JOIN repair_orders r ON r.id = p.repair_order_id WHERE p.created_at BETWEEN $1 AND $2 ${repairStore}`, params),
      this.dataSource.query(`SELECT method, count(*) FILTER (WHERE p.status = 'paid')::int AS count, COALESCE(sum(p.amount_cents) FILTER (WHERE p.status = 'paid'), 0)::bigint AS cents FROM payments p JOIN repair_orders r ON r.id = p.repair_order_id WHERE p.created_at BETWEEN $1 AND $2 ${repairStore} GROUP BY method ORDER BY cents DESC`, params),
      this.dataSource.query(`SELECT to_char(date_trunc('day', p.created_at), 'YYYY-MM-DD') AS date, COALESCE(sum(p.amount_cents) FILTER (WHERE p.status = 'paid'), 0)::bigint AS cents FROM payments p JOIN repair_orders r ON r.id = p.repair_order_id WHERE p.created_at BETWEEN $1 AND $2 ${repairStore} GROUP BY date_trunc('day', p.created_at) ORDER BY date_trunc('day', p.created_at)`, params),
      range.storeIds ? this.dataSource.query("SELECT status, count(*)::int AS count FROM purchase_orders WHERE store_id = ANY($1::uuid[]) GROUP BY status ORDER BY count DESC", [range.storeIds]) : this.dataSource.query("SELECT status, count(*)::int AS count FROM purchase_orders GROUP BY status ORDER BY count DESC")
    ]);
    let onlineSales: { count: number; cents: number; unitsSold: number; topProducts: { name: string; quantity: number; cents: number }[] } | null = null;
    const canSeeGlobalOnline = (request.user as AuthTokenPayload).role === "admin" && range.storeIds === null;
    if (canSeeGlobalOnline) {
      const [orders, products] = await Promise.all([
        this.dataSource.query("SELECT count(*)::int AS count, COALESCE(sum(total_cents), 0)::bigint AS cents, (SELECT COALESCE(sum(line.quantity), 0)::int FROM ecommerce_order_lines line JOIN ecommerce_orders line_order ON line_order.id = line.order_id WHERE line_order.created_at BETWEEN $1 AND $2 AND line_order.status IN ('paid', 'preparing', 'shipped', 'delivered')) AS units_sold FROM ecommerce_orders WHERE created_at BETWEEN $1 AND $2 AND status IN ('paid', 'preparing', 'shipped', 'delivered')", [range.from, range.to]),
        this.dataSource.query("SELECT line.title_snapshot AS name, sum(line.quantity)::int AS quantity, sum(line.quantity * line.unit_price_cents_snapshot)::bigint AS cents FROM ecommerce_order_lines line JOIN ecommerce_orders orders ON orders.id = line.order_id WHERE orders.created_at BETWEEN $1 AND $2 AND orders.status IN ('paid', 'preparing', 'shipped', 'delivered') GROUP BY line.title_snapshot ORDER BY quantity DESC, cents DESC LIMIT 5", [range.from, range.to])
      ]);
      onlineSales = { count: orders[0]?.count ?? 0, cents: Number(orders[0]?.cents ?? 0), unitsSold: Number(orders[0]?.units_sold ?? 0), topProducts: products };
    }
    return { period: { from: range.from.toISOString(), to: range.to.toISOString() }, storeIds: range.storeIds, paidSales: { count: sales[0]?.count ?? 0, cents: Number(sales[0]?.cents ?? 0) }, refundedSales: { count: sales[0]?.refunded_count ?? 0, cents: Number(sales[0]?.refunded_cents ?? 0) }, salesByMethod: byMethod, salesByDay: byDay, purchaseOrdersByStatus: purchases, onlineSales };
  }

  @Get("/administration")
  @PermissionRequired(PERMISSIONS.usersManage)
  async administration(@Req() request: FastifyRequest, @Res() reply: Reply): Promise<unknown> {
    const range = this.resolveRange(request, reply);
    if (!range || range.storeIds?.length === 0) return range ? this.emptyAdministration(range) : undefined;
    const [employees, registrations, stores] = await Promise.all([
      range.storeIds ? this.dataSource.query("SELECT role, count(*)::int AS count FROM users WHERE role IN ('admin', 'technician') AND (default_store_id = ANY($1::uuid[]) OR (store_access IS NOT NULL AND store_access ?| $2::text[])) GROUP BY role", [range.storeIds, range.storeIds]) : this.dataSource.query("SELECT role, count(*)::int AS count FROM users WHERE role IN ('admin', 'technician') GROUP BY role"),
      range.storeIds ? this.dataSource.query("SELECT registration_status AS status, count(*)::int AS count FROM customers WHERE created_at BETWEEN $1 AND $2 AND origin_store_id = ANY($3::uuid[]) GROUP BY registration_status", [range.from, range.to, range.storeIds]) : this.dataSource.query("SELECT registration_status AS status, count(*)::int AS count FROM customers WHERE created_at BETWEEN $1 AND $2 GROUP BY registration_status", [range.from, range.to]),
      range.storeIds ? this.dataSource.query("SELECT count(*)::int AS count FROM stores WHERE id = ANY($1::uuid[]) AND active = true", [range.storeIds]) : this.dataSource.query("SELECT count(*)::int AS count FROM stores WHERE active = true")
    ]);
    return { period: { from: range.from.toISOString(), to: range.to.toISOString() }, storeIds: range.storeIds, employeesByRole: employees, customerRegistrations: registrations, activeStores: stores[0]?.count ?? 0 };
  }

  private resolveRange(request: FastifyRequest, reply: Reply): Range | undefined {
    const parsed = rangeSchema.safeParse(request.query);
    if (!parsed.success) { reply.code(400).send({ message: "Invalid dashboard range" }); return undefined; }
    const user = request.user as AuthTokenPayload;
    const access = getStoreAccess(user);
    if (parsed.data.storeId && access && !access.includes(parsed.data.storeId)) { reply.code(403).send({ message: "No tienes acceso a la tienda seleccionada." }); return undefined; }
    const from = parsed.data.from ? new Date(`${parsed.data.from}T00:00:00.000Z`) : new Date(Date.now() - 30 * 86400000);
    const to = parsed.data.to ? new Date(`${parsed.data.to}T23:59:59.999Z`) : new Date();
    if (from > to) { reply.code(400).send({ message: "El periodo inicial debe ser anterior al final." }); return undefined; }
    return { storeIds: parsed.data.storeId ? [parsed.data.storeId] : access, from, to };
  }

  private emptyAttention(range: Range): unknown { return { period: { from: range.from.toISOString(), to: range.to.toISOString() }, storeIds: range.storeIds, repairsByStatus: [], total: 0, in_progress: 0, finished: 0, newCustomers: 0, technicians: [] }; }
  private emptyInventory(range: Range): unknown { return { period: { from: range.from.toISOString(), to: range.to.toISOString() }, storeIds: range.storeIds, inventoryItems: 0, lowStock: 0, stockPositionsByStatus: [], movementsByType: [], purchaseOrdersByStatus: [] }; }
  private emptySales(range: Range): unknown { return { period: { from: range.from.toISOString(), to: range.to.toISOString() }, storeIds: range.storeIds, paidSales: { count: 0, cents: 0 }, refundedSales: { count: 0, cents: 0 }, salesByMethod: [], salesByDay: [], purchaseOrdersByStatus: [], onlineSales: null }; }
  private emptyAdministration(range: Range): unknown { return { period: { from: range.from.toISOString(), to: range.to.toISOString() }, storeIds: range.storeIds, employeesByRole: [], customerRegistrations: [], activeStores: 0 }; }
}
