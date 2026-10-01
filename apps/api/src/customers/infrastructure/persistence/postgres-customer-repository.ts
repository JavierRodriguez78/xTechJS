import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { CustomerListOptions, CustomerPage, CustomerRepository, NewCustomerRecord } from "../../application/customer-repository.js";
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
      email: input.email,
      phone: input.phone || null,
      address: input.address || null,
      taxId: input.taxId || null,
      internalNotes: input.internalNotes || null,
      registrationStatus: "pending",
      tags: input.tags ?? []
    });
    return this.dataSource.getRepository(CustomerEntitySchema).save(customer);
  }

  findAll(): Promise<readonly Customer[]> {
    return this.dataSource.getRepository(CustomerEntitySchema).find({ order: { displayName: "ASC" } });
  }

  async findPage(options: CustomerListOptions): Promise<CustomerPage> {
    const query = this.dataSource.getRepository(CustomerEntitySchema).createQueryBuilder("customer");
    if (options.query) {
      query.andWhere("(customer.display_name ILIKE :query OR customer.email ILIKE :query OR customer.phone ILIKE :query OR customer.tax_id ILIKE :query)", { query: `%${options.query}%` });
    }
    if (options.registrationStatus) query.andWhere("customer.registration_status = :registrationStatus", { registrationStatus: options.registrationStatus });
    if (options.tag) query.andWhere("customer.tags @> :tag", { tag: JSON.stringify([options.tag]) });
    if (options.createdFrom) query.andWhere("customer.created_at >= :createdFrom", { createdFrom: options.createdFrom });
    if (options.createdTo) query.andWhere("customer.created_at < :createdTo", { createdTo: options.createdTo });
    const [field, rawDirection] = options.sort.split(":") as ["displayName" | "createdAt", "asc" | "desc"];
    const direction = rawDirection.toUpperCase() as "ASC" | "DESC";
    const column = field === "displayName" ? "customer.display_name" : "customer.created_at";
    query.orderBy(column, direction).addOrderBy("customer.id", "ASC");
    const [items, total] = await query.skip((options.page - 1) * options.pageSize).take(options.pageSize).getManyAndCount();
    return { items, total, page: options.page, pageSize: options.pageSize };
  }

  findById(id: string): Promise<Customer | undefined> {
    return this.dataSource.getRepository(CustomerEntitySchema).findOneBy({ id }).then((customer) => customer ?? undefined);
  }

  findByEmail(email: string): Promise<Customer | undefined> {
    return this.dataSource.getRepository(CustomerEntitySchema).findOneBy({ email: email.toLowerCase() }).then((customer) => customer ?? undefined);
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer | undefined> {
    const repository = this.dataSource.getRepository(CustomerEntitySchema);
    const customer = await repository.preload({ id, ...input });
    return customer ? repository.save(customer) : undefined;
  }
}