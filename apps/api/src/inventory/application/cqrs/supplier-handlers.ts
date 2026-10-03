import { Service } from "@xtaskjs/core";
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { Supplier } from "../../domain/supplier.js";
import { CreateSupplier } from "../create-supplier.js";
import { ListSuppliers } from "../list-suppliers.js";
import { DeactivateSupplier } from "../deactivate-supplier.js";
import { GetSupplier } from "../get-supplier.js";
import { ReactivateSupplier } from "../reactivate-supplier.js";
import { UpdateSupplier } from "../update-supplier.js";
import { CreateSupplierCommand, DeactivateSupplierCommand, GetSupplierQuery, ListSuppliersQuery, ReactivateSupplierCommand, UpdateSupplierCommand } from "./supplier-messages.js";

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
  execute(query: ListSuppliersQuery): Promise<readonly Supplier[]> { return this.useCase.execute(query.options); }
}

@Service()
@QueryHandler(GetSupplierQuery)
export class GetSupplierHandler implements IQueryHandler<GetSupplierQuery, Supplier | undefined> {
  constructor(private readonly useCase: GetSupplier) {}
  execute(query: GetSupplierQuery): Promise<Supplier | undefined> { return this.useCase.execute(query.id); }
}

@Service()
@CommandHandler(UpdateSupplierCommand)
export class UpdateSupplierHandler implements ICommandHandler<UpdateSupplierCommand, Supplier | undefined> {
  constructor(private readonly useCase: UpdateSupplier) {}
  execute(command: UpdateSupplierCommand): Promise<Supplier | undefined> { return this.useCase.execute(command.id, command.input); }
}

@Service()
@CommandHandler(DeactivateSupplierCommand)
export class DeactivateSupplierHandler implements ICommandHandler<DeactivateSupplierCommand, Supplier | undefined> {
  constructor(private readonly useCase: DeactivateSupplier) {}
  execute(command: DeactivateSupplierCommand): Promise<Supplier | undefined> { return this.useCase.execute(command.id); }
}

@Service()
@CommandHandler(ReactivateSupplierCommand)
export class ReactivateSupplierHandler implements ICommandHandler<ReactivateSupplierCommand, Supplier | undefined> {
  constructor(private readonly useCase: ReactivateSupplier) {}
  execute(command: ReactivateSupplierCommand): Promise<Supplier | undefined> { return this.useCase.execute(command.id); }
}
