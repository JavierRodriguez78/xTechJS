import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Supplier } from "../domain/supplier.js";
import type { SupplierRepository } from "./supplier-repository.js";

@Traceable("GetSupplier")
@Service()
export class GetSupplier {
  constructor(@Qualifier("supplierRepository") private readonly supplierRepository: SupplierRepository) {}

  execute(id: string): Promise<Supplier | undefined> {
    return this.supplierRepository.findById(id);
  }
}
