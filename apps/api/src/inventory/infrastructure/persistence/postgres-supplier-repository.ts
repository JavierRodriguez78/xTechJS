import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { CreateSupplierInput, Supplier, SupplierListOptions, UpdateSupplierInput } from "../../domain/supplier.js";
import type { SupplierRepository } from "../../application/supplier-repository.js";
import { SupplierEntitySchema } from "./supplier-entity.js";

@Traceable("PostgresSupplierRepository")
@Service({ name: "supplierRepository" })
export class PostgresSupplierRepository implements SupplierRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  create(input: CreateSupplierInput & { id: string }): Promise<Supplier> {
    return this.dataSource.getRepository(SupplierEntitySchema).save(input);
  }

  async findAll(options: SupplierListOptions = {}): Promise<readonly Supplier[]> {
    const query = this.dataSource.getRepository(SupplierEntitySchema).createQueryBuilder("supplier");
    if (options.query?.trim()) {
      query.andWhere("(supplier.name ILIKE :query OR supplier.legalName ILIKE :query OR supplier.taxId ILIKE :query)", { query: `%${options.query.trim()}%` });
    }
    if (options.category?.trim()) query.andWhere("LOWER(supplier.category) = LOWER(:category)", { category: options.category.trim() });
    if (options.active !== undefined) query.andWhere("supplier.active = :active", { active: options.active });
    return query.orderBy("supplier.name", "ASC").getMany();
  }

  async findById(id: string): Promise<Supplier | undefined> {
    return (await this.dataSource.getRepository(SupplierEntitySchema).findOneBy({ id })) ?? undefined;
  }

  async update(id: string, input: UpdateSupplierInput): Promise<Supplier | undefined> {
    const repository = this.dataSource.getRepository(SupplierEntitySchema);
    const supplier = await repository.findOneBy({ id });
    if (!supplier) return undefined;
    return repository.save(repository.merge(supplier, input));
  }

  async deactivate(id: string): Promise<Supplier | undefined> {
    return this.setActive(id, false);
  }

  async reactivate(id: string): Promise<Supplier | undefined> {
    return this.setActive(id, true);
  }

  private async setActive(id: string, active: boolean): Promise<Supplier | undefined> {
    const repository = this.dataSource.getRepository(SupplierEntitySchema);
    const supplier = await repository.findOneBy({ id });
    if (!supplier) return undefined;
    supplier.active = active;
    supplier.deactivatedAt = active ? null : new Date();
    return repository.save(supplier);
  }
}
