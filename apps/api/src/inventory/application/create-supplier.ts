import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CreateSupplierInput, Supplier } from "../domain/supplier.js";
import type { SupplierRepository } from "./supplier-repository.js";

@Traceable("CreateSupplier")
@Service()
export class CreateSupplier {
  constructor(@Qualifier("supplierRepository") private readonly supplierRepository: SupplierRepository) {}

  execute(input: CreateSupplierInput): Promise<Supplier> {
    return this.supplierRepository.create({
      id: randomUUID(),
      name: input.name.trim(),
      email: input.email?.trim().toLowerCase(),
      phone: input.phone?.trim(),
      notes: input.notes?.trim()
    });
  }
}
