import type { CreateSupplierInput, Supplier, SupplierListOptions, UpdateSupplierInput } from "../domain/supplier.js";

export interface SupplierRepository {
  create(input: CreateSupplierInput & { id: string }): Promise<Supplier>;
  findAll(options?: SupplierListOptions): Promise<readonly Supplier[]>;
  findById(id: string): Promise<Supplier | undefined>;
  update(id: string, input: UpdateSupplierInput): Promise<Supplier | undefined>;
  deactivate(id: string): Promise<Supplier | undefined>;
  reactivate(id: string): Promise<Supplier | undefined>;
}
