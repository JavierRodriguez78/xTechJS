import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { InvoiceDraft } from "../domain/invoice-draft.js";
import type { InvoiceDraftRepository } from "./invoice-draft-repository.js";

@Traceable("GetInvoiceDraft")
@Service()
export class GetInvoiceDraft {
  constructor(@Qualifier("invoiceDraftRepository") private readonly repository: InvoiceDraftRepository) {}

  execute(repairOrderId: string): Promise<InvoiceDraft | undefined> {
    return this.repository.findByRepairOrderId(repairOrderId);
  }
}
