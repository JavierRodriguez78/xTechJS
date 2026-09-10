import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import { ChangeRepairStatus } from "./change-repair-status.js";
import type { RepairQuote, SaveRepairQuoteInput } from "../domain/repair-quote.js";
import type { RepairQuoteRepository } from "./repair-quote-repository.js";

@Traceable("SaveRepairQuote")
@Service()
export class SaveRepairQuote {
  constructor(@Qualifier("repairQuoteRepository") private readonly quoteRepository: RepairQuoteRepository, @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository, private readonly changeRepairStatus: ChangeRepairStatus) {}

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