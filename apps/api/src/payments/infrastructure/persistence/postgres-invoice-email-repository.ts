import { Service } from "@xtaskjs/core";
import { InjectDataSource, type DataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import { InvoiceEmailEntitySchema } from "./invoice-email-entity.js";

@Traceable("PostgresInvoiceEmailRepository")
@Service({ name: "invoiceEmailRepository" })
export class PostgresInvoiceEmailRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async create(input: { id: string; paymentId: string; recipient: string; status: "sent" | "failed"; errorMessage: string | null }): Promise<void> {
    await this.dataSource.getRepository(InvoiceEmailEntitySchema).save(input);
  }
}