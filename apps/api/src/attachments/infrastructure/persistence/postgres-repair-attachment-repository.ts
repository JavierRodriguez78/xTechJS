import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { NewRepairAttachmentRecord, RepairAttachmentRepository } from "../../application/repair-attachment-repository.js";
import type { RepairAttachment } from "../../domain/repair-attachment.js";
import { RepairAttachmentEntitySchema } from "./repair-attachment-entity.js";

@Traceable("PostgresRepairAttachmentRepository")
@Service({ name: "repairAttachmentRepository" })
export class PostgresRepairAttachmentRepository implements RepairAttachmentRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  create(record: NewRepairAttachmentRecord): Promise<RepairAttachment> {
    return this.dataSource.getRepository(RepairAttachmentEntitySchema).save(record);
  }

  findById(id: string): Promise<RepairAttachment | undefined> {
    return this.dataSource.getRepository(RepairAttachmentEntitySchema).findOneBy({ id }).then((attachment) => attachment ?? undefined);
  }

  listByRepairOrder(repairOrderId: string): Promise<readonly RepairAttachment[]> {
    return this.dataSource.getRepository(RepairAttachmentEntitySchema).find({ where: { repairOrderId }, order: { createdAt: "DESC" } });
  }

  async delete(id: string): Promise<void> {
    await this.dataSource.getRepository(RepairAttachmentEntitySchema).delete({ id });
  }
}
