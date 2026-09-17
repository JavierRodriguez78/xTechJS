import type { InvoiceDraft } from "../domain/invoice-draft.js";

export interface InvoiceDraftRepository {
  findByRepairOrderId(repairOrderId: string): Promise<InvoiceDraft | undefined>;
}
