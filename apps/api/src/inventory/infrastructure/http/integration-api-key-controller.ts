import { Body, Controller, Get, Param, Patch, Post, Res } from "@xtaskjs/common";
import { Authenticated } from "@xtaskjs/security";
import { z } from "zod";
import { IntegrationApiKeyService, ActiveIntegrationNameExistsError } from "../../application/integration-api-key-service.js";
import { PERMISSIONS } from "../../../users/domain/permission.js";
import { PermissionRequired } from "../../../users/infrastructure/http/permission-guard.js";

type ControllerReply = { code(statusCode: number): ControllerReply; send(payload: unknown): unknown };
const createSchema = z.object({ name: z.string().trim().min(1).max(160) });
const revokeSchema = z.object({ active: z.literal(false) });

@Authenticated()
@Controller("/api/integrations/api-keys")
export class IntegrationApiKeyController {
  constructor(private readonly service: IntegrationApiKeyService) {}

  @Get()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  list(): Promise<unknown> { return this.service.list(); }

  @Post()
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async create(@Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid integration key", issues: parsed.error.flatten() });
    try { return reply.code(201).send(await this.service.create(parsed.data.name)); }
    catch (error) { if (error instanceof ActiveIntegrationNameExistsError) return reply.code(409).send({ message: error.message }); throw error; }
  }

  @Patch("/:id")
  @PermissionRequired(PERMISSIONS.inventoryManage)
  async revoke(@Param("id") id: string, @Body() body: unknown, @Res() reply: ControllerReply): Promise<unknown> {
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Only revocation is supported", issues: parsed.error.flatten() });
    const key = await this.service.revoke(id);
    return key ? key : reply.code(404).send({ message: "Integration key not found" });
  }
}
