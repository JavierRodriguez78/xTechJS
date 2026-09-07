import type { DataSource } from "typeorm";
import { Repository as XTaskRepository } from "@xtaskjs/core";
import { InjectDataSource } from "@xtaskjs/typeorm";
import type { UserRepository } from "../../application/user-repository.js";
import type { User, UserCredentials } from "../../domain/user.js";
import { UserEntitySchema } from "./user-entity.js";

@XTaskRepository({ name: "userRepository" })
export class PostgresUserRepository implements UserRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

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
}