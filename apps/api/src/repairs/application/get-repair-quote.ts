import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairQuote } from "../domain/repair-quote.js";
import type { RepairQuoteRepository } from "./repair-quote-repository.js";

@Traceable("GetRepairQuote")
@Service()
export class GetRepairQuote {
  constructor(@Qualifier("repairQuoteRepository") private readonly quoteRepository: RepairQuoteRepository) {}

  execute(repairOrderId: string): Promise<RepairQuote | undefined> {
    return this.quoteRepository.findByRepairOrderId(repairOrderId);
  }
}