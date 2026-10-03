import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Supplier, UpdateSupplierInput } from "../domain/supplier.js";
import type { SupplierRepository } from "./supplier-repository.js";

@Traceable("UpdateSupplier")
@Service()
export class UpdateSupplier {
  constructor(@Qualifier("supplierRepository") private readonly supplierRepository: SupplierRepository) {}

  execute(id: string, input: UpdateSupplierInput): Promise<Supplier | undefined> {
    const normalized: UpdateSupplierInput = { ...input };
    if (input.name !== undefined) normalized.name = input.name.trim();
    for (const key of ["legalName", "taxId", "email", "phone", "secondaryPhone", "addressStreet", "addressPostalCode", "addressCity", "addressProvince", "addressCountry", "category", "notes", "website"] as const) {
      const value = normalized[key];
      if (typeof value === "string") normalized[key] = key === "email" ? value.trim().toLowerCase() || null : key === "taxId" ? value.trim().toUpperCase() || null : value.trim() || null;
    }
    return this.supplierRepository.update(id, normalized);
  }
}
