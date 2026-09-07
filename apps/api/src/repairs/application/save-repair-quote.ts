import type { RepairOrderRepository } from "./repair-order-repository.js";
import type { ChangeRepairStatus } from "./change-repair-status.js";
import type { RepairQuote, SaveRepairQuoteInput } from "../domain/repair-quote.js";
import type { RepairQuoteRepository } from "./repair-quote-repository.js";

export class SaveRepairQuote {
  constructor(private readonly quoteRepository: RepairQuoteRepository, private readonly repairOrderRepository: RepairOrderRepository, private readonly changeRepairStatus: ChangeRepairStatus) {}

  async execute(repairOrderId: string, input: SaveRepairQuoteInput): Promise<RepairQuote | undefined> {
    const repair = await this.repairOrderRepository.findById(repairOrderId);
    if (!repair) return undefined;
    const lines = input.lines.map((line) => ({ ...line, description: line.description.trim() }));
    const totalCents = lines.reduce((total, line) => total + line.quantity * line.unitPriceCents, 0);
    const quote = await this.quoteRepository.save(repairOrderId, { ...input, lines, totalCents });
    if (input.status === "sent" && repair.status !== "quoted") await this.changeRepairStatus.execute(repairOrderId, "quoted", "Presupuesto enviado");
    return quote;
  }
}