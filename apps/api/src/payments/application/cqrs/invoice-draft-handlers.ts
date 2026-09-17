import { Service } from "@xtaskjs/core";
import { type IQueryHandler, QueryHandler } from "@xtaskjs/cqrs";
import type { InvoiceDraft } from "../../domain/invoice-draft.js";
import { GetInvoiceDraft } from "../get-invoice-draft.js";
import { GetInvoiceDraftQuery } from "./invoice-draft-messages.js";

@Service()
@QueryHandler(GetInvoiceDraftQuery)
export class GetInvoiceDraftHandler implements IQueryHandler<GetInvoiceDraftQuery, InvoiceDraft | undefined> {
  constructor(private readonly useCase: GetInvoiceDraft) {}

  execute(query: GetInvoiceDraftQuery): Promise<InvoiceDraft | undefined> {
    return this.useCase.execute(query.repairOrderId);
  }
}
