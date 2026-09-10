import type { CreateSupplierInput } from "../../domain/supplier.js";
export class CreateSupplierCommand { constructor(public readonly input: CreateSupplierInput) {} }
export class ListSuppliersQuery {}
