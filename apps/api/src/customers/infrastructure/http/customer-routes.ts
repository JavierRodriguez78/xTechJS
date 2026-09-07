import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { CreateCustomer } from "../../application/create-customer.js";
import type { GetCustomer } from "../../application/get-customer.js";
import type { ListCustomers } from "../../application/list-customers.js";
import type { UpdateCustomer } from "../../application/update-customer.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { requirePermission } from "../../../users/infrastructure/http/auth-routes.js";

const createCustomerSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().max(64).optional(),
  address: z.string().trim().max(1000).optional(),
  taxId: z.string().trim().max(64).optional(),
  internalNotes: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(20).optional()
});

const updateCustomerSchema = createCustomerSchema.partial().refine((input) => Object.keys(input).length > 0, "At least one field is required");

export function registerCustomerRoutes(
  app: FastifyInstance,
  createCustomer: CreateCustomer,
  listCustomers: ListCustomers,
  getCustomer: GetCustomer,
  updateCustomer: UpdateCustomer
): void {
  app.get("/api/customers", { preHandler: requirePermission(PERMISSIONS.customersRead) }, async () => listCustomers.execute());

  app.get("/api/customers/:id", { preHandler: requirePermission(PERMISSIONS.customersRead) }, async (request, reply) => {
    const customer = await getCustomer.execute((request.params as { id: string }).id);
    return customer ? customer : reply.code(404).send({ message: "Customer not found" });
  });

  app.post("/api/customers", { preHandler: requirePermission(PERMISSIONS.customersManage) }, async (request, reply) => {
    const parsed = createCustomerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid customer data", issues: parsed.error.flatten() });
    }
    const customer = await createCustomer.execute(parsed.data);
    return reply.code(201).send(customer);
  });

  app.put("/api/customers/:id", { preHandler: requirePermission(PERMISSIONS.customersManage) }, async (request, reply) => {
    const parsed = updateCustomerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid customer data", issues: parsed.error.flatten() });
    }
    const customer = await updateCustomer.execute((request.params as { id: string }).id, parsed.data);
    return customer ? customer : reply.code(404).send({ message: "Customer not found" });
  });
}