import type { CreateSupplierInput, SupplierListOptions, UpdateSupplierInput } from "../../domain/supplier.js";
export class CreateSupplierCommand { constructor(public readonly input: CreateSupplierInput) {} }
export class ListSuppliersQuery { constructor(public readonly options: SupplierListOptions = {}) {} }
export class GetSupplierQuery { constructor(public readonly id: string) {} }
export class UpdateSupplierCommand { constructor(public readonly id: string, public readonly input: UpdateSupplierInput) {} }
export class DeactivateSupplierCommand { constructor(public readonly id: string) {} }
export class ReactivateSupplierCommand { constructor(public readonly id: string) {} }
