import type { FastifyRequest } from "fastify";
import { Body, Controller, Post, Req, Res } from "@xtaskjs/common";
import { InjectCommandBus, type CommandBus } from "@xtaskjs/cqrs";
import { z } from "zod";
import { ImportSupplierCatalogCommand } from "../../application/cqrs/supplier-catalog-messages.js";
import { SupplierCatalogUniqueConflictError } from "../../application/supplier-catalog-service.js";
import type { SupplierCatalogItemInput } from "../../domain/supplier-catalog-item.js";
import { IntegrationApiKeyGuard } from "./integration-api-key-guard.js";

const supplierSchema = z.object({
  externalRef: z.string().trim().min(1).max(320),
  name: z.string().trim().min(1).max(180),
  website: z.string().trim().url().max(2000).optional(),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().max(64).optional()
});
const requestSchema = z.object({ supplier: supplierSchema, items: z.array(z.unknown()).max(500) });
const itemSchema = z.object({
  externalRef: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(120).nullable().optional(),
  brand: z.string().trim().max(120).nullable().optional(),
  compatibleModels: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  sku: z.string().trim().max(120).nullable().optional(),
  priceCents: z.number().int().min(0).max(2147483647),
  currency: z.string().regex(/^[A-Z]{3}$/).default("EUR"),
  availability: z.enum(["in_stock", "out_of_stock", "unknown"]).default("unknown"),
  url: z.string().trim().url().max(2000),
  capturedAt: z.string().datetime({ offset: true })
});

type ControllerReply = { code(statusCode: number): ControllerReply; send(payload: unknown): unknown };

@Controller("/api/integrations")
export class SupplierCatalogIntegrationController {
  constructor(
    @InjectCommandBus() private readonly commandBus: CommandBus,
    private readonly apiKeyGuard: IntegrationApiKeyGuard
  ) {}

  @Post("/spare-parts-catalog")
  async importCatalog(@Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): Promise<unknown> {
    if (!await this.apiKeyGuard.authorize(request, "spare-parts-catalog:write")) return reply.code(401).send({ message: "Unauthorized" });
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid supplier catalog payload", issues: parsed.error.flatten() });

    const validItems: SupplierCatalogItemInput[] = [];
    const errors: { index: number; errors: unknown }[] = [];
    parsed.data.items.forEach((rawItem, index) => {
      const item = itemSchema.safeParse(rawItem);
      if (!item.success) {
        errors.push({ index, errors: item.error.flatten() });
        return;
      }
      validItems.push({ ...item.data, capturedAt: new Date(item.data.capturedAt) });
    });

    try {
      const result = await this.commandBus.execute(new ImportSupplierCatalogCommand(parsed.data.supplier, validItems));
      const payload = { supplierId: result.supplier.id, created: result.created, updated: result.updated, skipped: errors.length, errors };
      return reply.code(result.supplierCreated ? 201 : 200).send(payload);
    } catch (error) {
      if (error instanceof SupplierCatalogUniqueConflictError) return reply.code(409).send({ message: error.message });
      throw error;
    }
  }
}
