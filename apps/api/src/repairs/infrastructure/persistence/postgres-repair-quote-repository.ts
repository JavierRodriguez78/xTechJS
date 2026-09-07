import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import type { RepairQuoteRepository } from "../../application/repair-quote-repository.js";
import type { RepairQuote, SaveRepairQuoteInput } from "../../domain/repair-quote.js";
import { RepairQuoteEntitySchema } from "./repair-quote-entity.js";

export class PostgresRepairQuoteRepository implements RepairQuoteRepository {
  constructor(private readonly dataSource: DataSource) {}

  findByRepairOrderId(repairOrderId: string): Promise<RepairQuote | undefined> {
    return this.dataSource.getRepository(RepairQuoteEntitySchema).findOneBy({ repairOrderId }).then((quote) => quote ?? undefined);
  }

  async save(repairOrderId: string, input: SaveRepairQuoteInput & { totalCents: number }): Promise<RepairQuote> {
    const repository = this.dataSource.getRepository(RepairQuoteEntitySchema);
    const current = await repository.findOneBy({ repairOrderId });
    return repository.save({ id: current?.id ?? randomUUID(), repairOrderId, ...input, status: input.status });
  }

  async updateStatus(repairOrderId: string, status: RepairQuote["status"]): Promise<RepairQuote | undefined> {
    const repository = this.dataSource.getRepository(RepairQuoteEntitySchema);
    const quote = await repository.findOneBy({ repairOrderId });
    if (!quote) return undefined;
    quote.status = status;
    return repository.save(quote);
  }
}