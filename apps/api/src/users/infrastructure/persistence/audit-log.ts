import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";

export async function recordImpersonation(
  dataSource: DataSource,
  actorId: string,
  targetId: string
): Promise<void> {
  await dataSource.query(
    'INSERT INTO "audit_logs" ("id", "actor_id", "target_id", "action") VALUES ($1, $2, $3, $4)',
    [randomUUID(), actorId, targetId, "user.impersonated"]
  );
}