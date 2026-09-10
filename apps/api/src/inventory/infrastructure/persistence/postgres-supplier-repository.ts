import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { CreateSupplierInput, Supplier } from "../../domain/supplier.js";
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

  findAll(): Promise<readonly Supplier[]> {
    return this.dataSource.getRepository(SupplierEntitySchema).find({ order: { name: "ASC" } });
  }
}
