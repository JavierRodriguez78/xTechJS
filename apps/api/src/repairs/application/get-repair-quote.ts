import type { RepairQuote } from "../domain/repair-quote.js";
import type { RepairQuoteRepository } from "./repair-quote-repository.js";

export class GetRepairQuote {
  constructor(private readonly quoteRepository: RepairQuoteRepository) {}

  execute(repairOrderId: string): Promise<RepairQuote | undefined> {
    return this.quoteRepository.findByRepairOrderId(repairOrderId);
  }
}