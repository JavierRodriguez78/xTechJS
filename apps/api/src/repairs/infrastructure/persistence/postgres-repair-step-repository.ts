import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { NewRepairStepRecord, RepairStepRepository } from "../../application/repair-step-repository.js";
import type { RepairStep } from "../../domain/repair-step.js";
import { RepairStepEntitySchema } from "./repair-step-entity.js";

@Traceable("PostgresRepairStepRepository")
@Service({ name: "repairStepRepository" })
export class PostgresRepairStepRepository implements RepairStepRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  create(record: NewRepairStepRecord): Promise<RepairStep> {
    return this.dataSource.getRepository(RepairStepEntitySchema).save(record);
  }

  findById(id: string): Promise<RepairStep | undefined> {
    return this.dataSource.getRepository(RepairStepEntitySchema).findOneBy({ id }).then((step) => step ?? undefined);
  }

  listByRepairOrder(repairOrderId: string): Promise<readonly RepairStep[]> {
    return this.dataSource.getRepository(RepairStepEntitySchema).find({ where: { repairOrderId }, order: { sequence: "ASC" } });
  }

  async nextSequence(repairOrderId: string): Promise<number> {
    const result = await this.dataSource.getRepository(RepairStepEntitySchema)
      .createQueryBuilder("step")
      .select("COALESCE(MAX(step.sequence), 0) + 1", "nextSequence")
      .where("step.repair_order_id = :repairOrderId", { repairOrderId })
      .getRawOne<{ nextSequence: string }>();
    return Number(result?.nextSequence ?? 1);
  }

  async update(id: string, input: Pick<RepairStep, "title" | "description" | "performedAt">): Promise<RepairStep | undefined> {
    const repository = this.dataSource.getRepository(RepairStepEntitySchema);
    const step = await repository.preload({ id, ...input });
    return step ? repository.save(step) : undefined;
  }

  async delete(id: string): Promise<void> {
    await this.dataSource.getRepository(RepairStepEntitySchema).delete({ id });
  }
}