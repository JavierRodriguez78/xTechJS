import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { IsNull } from "typeorm";
import { hash, compare } from "bcryptjs";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { CustomerRegistrationTokenRecord, CustomerRegistrationTokenRepository } from "../../application/customer-repository.js";
import { CustomerRegistrationTokenEntitySchema, type CustomerRegistrationTokenRecordEntity } from "./customer-registration-token-entity.js";

@Traceable("PostgresCustomerRegistrationTokenRepository")
@Service({ name: "customerRegistrationTokenRepository" })
export class PostgresCustomerRegistrationTokenRepository implements CustomerRegistrationTokenRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async createForCustomer(customerId: string, token: string, expiresAt: Date): Promise<CustomerRegistrationTokenRecord> {
    const repository = this.dataSource.getRepository(CustomerRegistrationTokenEntitySchema);
    const tokenHash = await hash(token, 12);
    const record = repository.create({
      id: randomUUID(),
      customerId,
      tokenHash,
      expiresAt,
      usedAt: null,
      createdAt: new Date()
    });
    return repository.save(record);
  }

  async findValidByToken(token: string): Promise<CustomerRegistrationTokenRecord | undefined> {
    const repository = this.dataSource.getRepository(CustomerRegistrationTokenEntitySchema);
    const now = new Date();
    const records = await repository.find({ where: { usedAt: IsNull() }, order: { createdAt: "DESC" } });
    for (const record of records) {
      if (record.expiresAt.getTime() < now.getTime()) continue;
      if (await compare(token, record.tokenHash)) {
        return record;
      }
    }
    return undefined;
  }

  async markUsed(id: string): Promise<void> {
    await this.dataSource.getRepository(CustomerRegistrationTokenEntitySchema).update(id, { usedAt: new Date() });
  }

  static toPublicRecord(record: CustomerRegistrationTokenRecordEntity): CustomerRegistrationTokenRecord {
    return { ...record };
  }
}
