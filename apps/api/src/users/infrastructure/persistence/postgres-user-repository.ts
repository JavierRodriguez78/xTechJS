import type { DataSource } from "typeorm";
import type { UserRepository } from "../../application/user-repository.js";
import type { User } from "../../domain/user.js";
import { UserEntitySchema } from "./user-entity.js";

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  findAll(): Promise<readonly User[]> {
    return this.dataSource.getRepository(UserEntitySchema).find({ order: { displayName: "ASC" } });
  }

  findById(id: string): Promise<User | undefined> {
    return this.dataSource.getRepository(UserEntitySchema).findOneBy({ id }).then((user) => user ?? undefined);
  }
}