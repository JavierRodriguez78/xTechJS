import type { FastifyRequest } from "fastify";
import { Service } from "@xtaskjs/core";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { IntegrationApiScope } from "../../domain/integration-api-key.js";
import { IntegrationApiKeyService } from "../../application/integration-api-key-service.js";

@Traceable("IntegrationApiKeyGuard")
@Service()
export class IntegrationApiKeyGuard {
  constructor(private readonly apiKeys: IntegrationApiKeyService) {}

  authorize(request: FastifyRequest, scope: IntegrationApiScope): Promise<boolean> {
    const header = request.headers["x-api-key"];
    return this.apiKeys.authenticate(typeof header === "string" ? header : undefined, scope);
  }
}
