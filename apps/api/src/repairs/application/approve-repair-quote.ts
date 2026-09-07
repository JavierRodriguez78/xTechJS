import type { ChangeRepairStatus } from "./change-repair-status.js";
import type { RepairQuote } from "../domain/repair-quote.js";
import type { RepairQuoteRepository } from "./repair-quote-repository.js";

export class ApproveRepairQuote {
  constructor(private readonly quoteRepository: RepairQuoteRepository, private readonly changeRepairStatus: ChangeRepairStatus) {}

  async execute(repairOrderId: string): Promise<RepairQuote | undefined> {
    const quote = await this.quoteRepository.findByRepairOrderId(repairOrderId);
    if (!quote) return undefined;
    if (quote.status !== "sent") throw new Error("Only sent repair quotes can be approved");
    await this.changeRepairStatus.execute(repairOrderId, "approved", "Presupuesto aprobado");
    return this.quoteRepository.updateStatus(repairOrderId, "approved");
  }
}