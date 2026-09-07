import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ChangeRepairStatus } from "../../application/change-repair-status.js";
import type { CreateRepairOrder } from "../../application/create-repair-order.js";
import type { GetRepairStatusHistory } from "../../application/get-repair-status-history.js";
import type { ListRepairOrders } from "../../application/list-repair-orders.js";
import { REPAIR_STATUSES } from "../../domain/repair-status.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { requirePermission } from "../../../users/infrastructure/http/auth-routes.js";

const createSchema = z.object({ customerId: z.string().uuid(), deviceType: z.string().trim().min(1).max(100), brand: z.string().trim().min(1).max(100), model: z.string().trim().min(1).max(160), serialNumber: z.string().trim().max(160).optional(), reportedIssue: z.string().trim().min(1).max(5000), deliveredAccessories: z.string().trim().max(2000).optional() });
const statusSchema = z.object({ status: z.enum(REPAIR_STATUSES), note: z.string().trim().max(2000).optional() });

export function registerRepairRoutes(app: FastifyInstance, createRepair: CreateRepairOrder, listRepairs: ListRepairOrders, changeStatus: ChangeRepairStatus, getStatusHistory: GetRepairStatusHistory): void {
  app.get("/api/repairs", { preHandler: requirePermission(PERMISSIONS.repairsRead) }, async () => listRepairs.execute());
  app.get("/api/repairs/:id/history", { preHandler: requirePermission(PERMISSIONS.repairsRead) }, async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const history = await getStatusHistory.execute(id);
    return history.length ? history : reply.code(404).send({ message: "Repair order not found" });
  });
  app.post("/api/repairs", { preHandler: requirePermission(PERMISSIONS.repairsManage) }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair order", issues: parsed.error.flatten() });
    return reply.code(201).send(await createRepair.execute(parsed.data));
  });
  app.patch("/api/repairs/:id/status", { preHandler: requirePermission(PERMISSIONS.repairsManage) }, async (request, reply) => {
    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid repair status", issues: parsed.error.flatten() });
    try {
      const repair = await changeStatus.execute((request.params as { id: string }).id, parsed.data.status, parsed.data.note);
      return repair ?? reply.code(404).send({ message: "Repair order not found" });
    } catch (error) {
      return reply.code(409).send({ message: (error as Error).message });
    }
  });
}