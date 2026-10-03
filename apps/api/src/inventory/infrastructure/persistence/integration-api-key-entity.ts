import { EntitySchema } from "typeorm";
import type { IntegrationApiKey } from "../../domain/integration-api-key.js";

export const IntegrationApiKeyEntitySchema = new EntitySchema<IntegrationApiKey>({
  name: "IntegrationApiKey",
  tableName: "integration_api_keys",
  columns: {
    id: { type: "uuid", primary: true },
    name: { type: String, length: 160 },
    keyHash: { type: String, name: "key_hash", length: 60 },
    scope: { type: String, length: 64 },
    active: { type: Boolean, default: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    lastUsedAt: { type: "timestamptz", name: "last_used_at", nullable: true }
  },
  indices: [{ columns: ["active", "scope"], name: "IDX_integration_api_keys_active_scope" }]
});
