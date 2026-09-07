import type { RepairQuote, SaveRepairQuoteInput } from "../domain/repair-quote.js";

export interface RepairQuoteRepository {
  findByRepairOrderId(repairOrderId: string): Promise<RepairQuote | undefined>;
  save(repairOrderId: string, input: SaveRepairQuoteInput & { totalCents: number }): Promise<RepairQuote>;
  updateStatus(repairOrderId: string, status: RepairQuote["status"]): Promise<RepairQuote | undefined>;
}