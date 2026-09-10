import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { Supplier } from "../../domain/supplier.js";
import { CreateSupplier } from "../create-supplier.js";
import { ListSuppliers } from "../list-suppliers.js";
import { CreateSupplierCommand, ListSuppliersQuery } from "./supplier-messages.js";

@Service()
@CommandHandler(CreateSupplierCommand)
export class CreateSupplierHandler implements ICommandHandler<CreateSupplierCommand, Supplier> {
  constructor(private readonly useCase: CreateSupplier) {}
  execute(command: CreateSupplierCommand): Promise<Supplier> { return this.useCase.execute(command.input); }
}

@Service()
@QueryHandler(ListSuppliersQuery)
export class ListSuppliersHandler implements IQueryHandler<ListSuppliersQuery, readonly Supplier[]> {
  constructor(private readonly useCase: ListSuppliers) {}
  execute(): Promise<readonly Supplier[]> { return this.useCase.execute(); }
}
