import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { AuditLogEntry, UserRepository } from "../../application/user-repository.js";
import type { User, UserCredentials } from "../../domain/user.js";
import { UserEntitySchema } from "./user-entity.js";

@Traceable("PostgresUserRepository")
@Service({ name: "userRepository" })
export class PostgresUserRepository implements UserRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  findAll(): Promise<readonly User[]> {
    return this.dataSource.getRepository(UserEntitySchema).find({ order: { displayName: "ASC" } });
  }

  findById(id: string): Promise<User | undefined> {
    return this.dataSource.getRepository(UserEntitySchema).findOneBy({ id }).then((user) => user ?? undefined);
  }

  findActiveByRole(role: User["role"]): Promise<readonly User[]> {
    return this.dataSource.getRepository(UserEntitySchema).find({ where: { role, active: true }, order: { displayName: "ASC" } });
  }

  findByEmail(email: string): Promise<UserCredentials | undefined> {
    return this.dataSource
      .getRepository(UserEntitySchema)
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.email = :email", { email })
      .getOne()
      .then((user) => user ?? undefined);
  }

  count(): Promise<number> {
    return this.dataSource.getRepository(UserEntitySchema).count();
  }

  async create(user: UserCredentials): Promise<User> {
    const { passwordHash: _, ...publicUser } = await this.dataSource.getRepository(UserEntitySchema).save(user);
    return publicUser;
  }

  async update(id: string, input: Partial<Pick<User, "email" | "displayName" | "role" | "active">> & { passwordHash?: string }): Promise<User | undefined> {
    const repository = this.dataSource.getRepository(UserEntitySchema);
    const user = await repository.preload({ id, ...input });
    if (!user) return undefined;
    const saved = await repository.save(user);
    const { passwordHash: _, ...publicUser } = saved;
    return publicUser;
  }

  async listAuditLogs(): Promise<readonly AuditLogEntry[]> {
    const rows = await this.dataSource.query(`
      SELECT
        a.id,
        a.action,
        a.created_at AS "createdAt",
        actor.display_name AS "actorName",
        actor.email AS "actorEmail",
        target.display_name AS "targetName",
        target.email AS "targetEmail"
      FROM audit_logs a
      LEFT JOIN users actor ON actor.id = a.actor_id
      LEFT JOIN users target ON target.id = a.target_id
      ORDER BY a.created_at DESC, a.id DESC
    `);

    return rows.map((row: any) => ({
      id: row.id,
      action: row.action,
      createdAt: new Date(row.createdAt).toISOString(),
      actorName: row.actorName ?? null,
      actorEmail: row.actorEmail ?? null,
      targetName: row.targetName ?? null,
      targetEmail: row.targetEmail ?? null
    }));
  }
}