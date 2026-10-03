import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Customer, UpdateCustomerInput } from "../domain/customer.js";
import type { CustomerRepository } from "./customer-repository.js";

@Traceable("UpdateCustomer")
@Service()
export class UpdateCustomer {
  constructor(@Qualifier("customerRepository") private readonly customerRepository: CustomerRepository) {}

  execute(id: string, input: UpdateCustomerInput): Promise<Customer | undefined> {
    return this.customerRepository.update(id, {
      displayName: input.displayName?.trim(),
      email: input.email?.trim().toLowerCase(),
      phone: input.phone?.trim(),
      addressStreet: input.addressStreet?.trim(),
      addressPostalCode: input.addressPostalCode?.trim(),
      addressCity: input.addressCity?.trim(),
      addressProvince: input.addressProvince?.trim(),
      addressCountry: input.addressCountry?.trim(),
      taxId: input.taxId?.trim().toUpperCase(),
      customerType: input.customerType,
      internalNotes: input.internalNotes?.trim(),
      billingName: input.billingName?.trim(),
      billingTaxId: input.billingTaxId?.trim().toUpperCase(),
      billingAddressStreet: input.billingAddressStreet?.trim(),
      billingAddressPostalCode: input.billingAddressPostalCode?.trim(),
      billingAddressCity: input.billingAddressCity?.trim(),
      billingAddressProvince: input.billingAddressProvince?.trim(),
      billingAddressCountry: input.billingAddressCountry?.trim(),
      tags: input.tags ? [...new Set(input.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))] : undefined
    });
  }
}