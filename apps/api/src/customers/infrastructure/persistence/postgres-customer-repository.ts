import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { CustomerRepository, NewCustomerRecord } from "../../application/customer-repository.js";
import type { Customer, UpdateCustomerInput } from "../../domain/customer.js";
import { CustomerEntitySchema } from "./customer-entity.js";

@Traceable("PostgresCustomerRepository")
@Service({ name: "customerRepository" })
export class PostgresCustomerRepository implements CustomerRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async create(input: NewCustomerRecord): Promise<Customer> {
    const customer = this.dataSource.getRepository(CustomerEntitySchema).create({
      id: input.id ?? randomUUID(),
      displayName: input.displayName,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      taxId: input.taxId || null,
      internalNotes: input.internalNotes || null,
      tags: input.tags ?? []
    });
    return this.dataSource.getRepository(CustomerEntitySchema).save(customer);
  }

  findAll(): Promise<readonly Customer[]> {
    return this.dataSource.getRepository(CustomerEntitySchema).find({ order: { displayName: "ASC" } });
  }

  findById(id: string): Promise<Customer | undefined> {
    return this.dataSource.getRepository(CustomerEntitySchema).findOneBy({ id }).then((customer) => customer ?? undefined);
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer | undefined> {
    const repository = this.dataSource.getRepository(CustomerEntitySchema);
    const customer = await repository.preload({ id, ...input });
    return customer ? repository.save(customer) : undefined;
  }
}