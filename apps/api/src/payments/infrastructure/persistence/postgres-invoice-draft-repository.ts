import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import type { InvoiceDraftRepository } from "../../application/invoice-draft-repository.js";
import type { InvoiceDraft } from "../../domain/invoice-draft.js";
import { InvoiceDraftEntitySchema } from "./invoice-draft-entity.js";

@Service({ name: "invoiceDraftRepository" })
export class PostgresInvoiceDraftRepository implements InvoiceDraftRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  findByRepairOrderId(repairOrderId: string): Promise<InvoiceDraft | undefined> {
    return this.dataSource.getRepository(InvoiceDraftEntitySchema).findOneBy({ repairOrderId }).then((draft) => draft ?? undefined);
  }
}
