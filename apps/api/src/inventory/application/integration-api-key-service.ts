import { randomBytes, randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { IntegrationApiKey, PublicIntegrationApiKey } from "../domain/integration-api-key.js";
import { IntegrationApiKeyEntitySchema } from "../infrastructure/persistence/integration-api-key-entity.js";

export class ActiveIntegrationNameExistsError extends Error {}

@Traceable("IntegrationApiKeyService")
@Service()
export class IntegrationApiKeyService {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async list(): Promise<PublicIntegrationApiKey[]> {
    const keys = await this.dataSource.getRepository(IntegrationApiKeyEntitySchema).find({ order: { createdAt: "DESC" } });
    return keys.map(({ keyHash: _keyHash, ...key }) => key);
  }

  async create(nameInput: string): Promise<{ key: string; integration: PublicIntegrationApiKey }> {
    const name = nameInput.trim();
    const repository = this.dataSource.getRepository(IntegrationApiKeyEntitySchema);
    if (await repository.findOneBy({ name, active: true })) throw new ActiveIntegrationNameExistsError("An active key already exists for this integration");
    const key = `xtech_${randomBytes(32).toString("hex")}`;
    const record: IntegrationApiKey = await repository.save({
      id: randomUUID(),
      name,
      keyHash: await hash(key, 12),
      scope: "spare-parts-catalog:write",
      active: true,
      createdAt: new Date(),
      lastUsedAt: null
    });
    const { keyHash: _keyHash, ...integration } = record;
    return { key, integration };
  }

  async revoke(id: string): Promise<PublicIntegrationApiKey | undefined> {
    const repository = this.dataSource.getRepository(IntegrationApiKeyEntitySchema);
    const record = await repository.findOneBy({ id });
    if (!record) return undefined;
    record.active = false;
    const saved = await repository.save(record);
    const { keyHash: _keyHash, ...publicRecord } = saved;
    return publicRecord;
  }

  async authenticate(rawKey: string | undefined, scope: IntegrationApiKey["scope"]): Promise<boolean> {
    if (!rawKey) return false;
    const repository = this.dataSource.getRepository(IntegrationApiKeyEntitySchema);
    const candidates = await repository.find({ where: { active: true, scope } });
    for (const candidate of candidates) {
      if (!await compare(rawKey, candidate.keyHash)) continue;
      await repository.update(candidate.id, { lastUsedAt: new Date() });
      return true;
    }
    return false;
  }
}
