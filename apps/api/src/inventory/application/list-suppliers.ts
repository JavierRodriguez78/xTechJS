import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Supplier } from "../domain/supplier.js";
import type { SupplierRepository } from "./supplier-repository.js";

@Traceable("ListSuppliers")
@Service()
export class ListSuppliers {
  constructor(@Qualifier("supplierRepository") private readonly supplierRepository: SupplierRepository) {}

  execute(): Promise<readonly Supplier[]> {
    return this.supplierRepository.findAll();
  }
}
