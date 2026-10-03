import assert from "node:assert/strict";
import test from "node:test";
import { IntegrationApiKeyEntitySchema } from "../infrastructure/persistence/integration-api-key-entity.js";
import { ActiveIntegrationNameExistsError, IntegrationApiKeyService } from "./integration-api-key-service.js";

function harness() {
  const keys: Record<string, unknown>[] = [];
  const repository = {
    async findOneBy(where: Record<string, unknown>) { return keys.find((key) => Object.entries(where).every(([field, value]) => key[field] === value)) ?? null; },
    async find(options?: { where?: Record<string, unknown> }) { return keys.filter((key) => !options?.where || Object.entries(options.where).every(([field, value]) => key[field] === value)); },
    async save(input: Record<string, unknown>) { const index = keys.findIndex((key) => key.id === input.id); if (index >= 0) keys[index] = { ...keys[index], ...input }; else keys.push({ ...input }); return keys.find((key) => key.id === input.id); },
    async update(id: string, input: Record<string, unknown>) { const key = keys.find((entry) => entry.id === id); if (key) Object.assign(key, input); }
  };
  const service = new IntegrationApiKeyService();
  (service as unknown as { dataSource: unknown }).dataSource = { getRepository(schema: unknown) { assert.equal(schema, IntegrationApiKeyEntitySchema); return repository; } };
  return { service, keys };
}

test("creates one-time keys as hashes and updates last-use metadata on authentication", async () => {
  const { service, keys } = harness();
  const created = await service.create("repuestos-watch");

  assert.match(created.key, /^xtech_[a-f0-9]{64}$/);
  assert.equal(created.integration.name, "repuestos-watch");
  assert.equal("keyHash" in created.integration, false);
  assert.notEqual(keys[0].keyHash, created.key);
  assert.equal(await service.authenticate(created.key, "spare-parts-catalog:write"), true);
  assert.ok(keys[0].lastUsedAt instanceof Date);
  assert.equal(await service.authenticate("wrong-key", "spare-parts-catalog:write"), false);
  assert.equal((await service.list()).length, 1);
});

test("revokes a key and permits a replacement with the same integration name", async () => {
  const { service } = harness();
  const first = await service.create("repuestos-watch");
  await service.revoke(first.integration.id);
  const second = await service.create("repuestos-watch");

  assert.notEqual(first.key, second.key);
  assert.equal(await service.authenticate(first.key, "spare-parts-catalog:write"), false);
  assert.equal(await service.authenticate(second.key, "spare-parts-catalog:write"), true);
});

test("does not allow two active keys for the same integration", async () => {
  const { service } = harness();
  await service.create("repuestos-watch");
  await assert.rejects(() => service.create("repuestos-watch"), ActiveIntegrationNameExistsError);
});
