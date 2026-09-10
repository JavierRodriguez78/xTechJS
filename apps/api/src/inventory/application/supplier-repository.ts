import type { CreateSupplierInput, Supplier } from "../domain/supplier.js";

export interface SupplierRepository {
  create(input: CreateSupplierInput & { id: string }): Promise<Supplier>;
  findAll(): Promise<readonly Supplier[]>;
}
