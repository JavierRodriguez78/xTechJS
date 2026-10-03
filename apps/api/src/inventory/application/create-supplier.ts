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
      notes: input.notes?.trim(),
      externalRef: input.externalRef?.trim().toLowerCase() || null,
      website: input.website?.trim() || null,
      legalName: input.legalName?.trim() || null,
      taxId: input.taxId?.trim().toUpperCase() || null,
      secondaryPhone: input.secondaryPhone?.trim() || null,
      addressStreet: input.addressStreet?.trim() || null,
      addressPostalCode: input.addressPostalCode?.trim() || null,
      addressCity: input.addressCity?.trim() || null,
      addressProvince: input.addressProvince?.trim() || null,
      addressCountry: input.addressCountry?.trim() || null,
      paymentTermDays: input.paymentTermDays ?? null,
      category: input.category?.trim() || null
    });
  }
}
