import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { CustomerNotificationRecord, CustomerNotificationRepository, CustomerNotificationStatus } from "../../application/customer-notification-repository.js";
import { CustomerNotificationEntitySchema } from "./customer-notification-entity.js";

@Traceable("PostgresCustomerNotificationRepository")
@Service({ name: "customerNotificationRepository" })
export class PostgresCustomerNotificationRepository implements CustomerNotificationRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async record(input: Omit<CustomerNotificationRecord, "id" | "createdAt" | "errorMessage"> & { errorMessage?: string | null }): Promise<CustomerNotificationRecord> {
    const repository = this.dataSource.getRepository(CustomerNotificationEntitySchema);
    const id = randomUUID();
    await repository.save({
      id,
      customerId: input.customerId,
      repairOrderId: input.repairOrderId,
      templateKey: input.templateKey,
      recipient: input.recipient,
      subject: input.subject,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
      createdAt: new Date()
    });
    const saved = await repository.findOneBy({ id });
    if (!saved) throw new Error("Customer notification could not be persisted");
    return saved;
  }

  async markDelivery(id: string, status: CustomerNotificationStatus, errorMessage?: string): Promise<void> {
    await this.dataSource.getRepository(CustomerNotificationEntitySchema).update({ id }, { status, errorMessage: errorMessage ?? null });
  }
}
