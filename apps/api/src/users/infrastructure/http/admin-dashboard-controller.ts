import { Controller, Get, Req, Res } from "@xtaskjs/common";
import { Authenticated } from "@xtaskjs/security";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { PERMISSIONS } from "../../domain/permission.js";
import { PermissionRequired } from "./permission-guard.js";
import type { AuthTokenPayload } from "./auth-routes.js";

const schema = z.object({ storeId: z.string().uuid().optional(), from: z.string().date().optional(), to: z.string().date().optional() });
type Reply = { code(status: number): { send(value: unknown): unknown } };

@Authenticated()
@Controller("/api/admin/dashboard")
export class AdminDashboardController {
  @InjectDataSource() private readonly dataSource!: DataSource;

  @Get("/summary")
  @PermissionRequired(PERMISSIONS.usersManage)
  async summary(@Req() request: FastifyRequest, @Res() reply: Reply): Promise<unknown> {
    const parsed = schema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid dashboard range" });
    const user = request.user as AuthTokenPayload;
    const storeId = user.storeId ?? parsed.data.storeId;
    const from = parsed.data.from ? new Date(`${parsed.data.from}T00:00:00.000Z`) : new Date(new Date().setDate(new Date().getDate() - 30));
    const to = parsed.data.to ? new Date(`${parsed.data.to}T23:59:59.999Z`) : new Date();
    const repairStore = storeId ? 'AND store_id = $3' : '';
    const customerStore = storeId ? 'AND origin_store_id = $3' : '';
    const params = storeId ? [from, to, storeId] : [from, to];
    const [clients, repairs, purchases, lowStock, sales, technicians] = await Promise.all([
      this.dataSource.query(`SELECT count(*)::int AS count FROM customers WHERE created_at BETWEEN $1 AND $2 ${customerStore}`, params),
      this.dataSource.query(`SELECT status, count(*)::int AS count FROM repair_orders WHERE created_at BETWEEN $1 AND $2 ${repairStore} GROUP BY status`, params),
      this.dataSource.query('SELECT status, count(*)::int AS count FROM purchase_orders GROUP BY status'),
      storeId ? this.dataSource.query('SELECT count(*)::int AS count FROM store_inventory_stock WHERE store_id = $1 AND stock <= minimum_stock', [storeId]) : this.dataSource.query('SELECT count(*)::int AS count FROM store_inventory_stock WHERE stock <= minimum_stock'),
      this.dataSource.query(`SELECT count(*)::int AS count, COALESCE(sum(p.amount_cents), 0)::int AS cents FROM payments p JOIN repair_orders r ON r.id = p.repair_order_id WHERE p.status = 'paid' AND p.created_at BETWEEN $1 AND $2 ${repairStore}`, params),
      this.dataSource.query(`SELECT COALESCE(u.display_name, 'Sin asignar') AS name, count(*)::int AS count FROM repair_orders r LEFT JOIN users u ON u.id = r.technician_id WHERE r.created_at BETWEEN $1 AND $2 ${repairStore} GROUP BY u.display_name ORDER BY count DESC LIMIT 5`, params)
    ]);
    return { period: { from: from.toISOString(), to: to.toISOString() }, storeId: storeId ?? null, newCustomers: clients[0]?.count ?? 0, repairsByStatus: repairs, purchaseOrdersByStatus: purchases, lowStock: lowStock[0]?.count ?? 0, paidSales: sales[0] ?? { count: 0, cents: 0 }, technicians };
  }
}