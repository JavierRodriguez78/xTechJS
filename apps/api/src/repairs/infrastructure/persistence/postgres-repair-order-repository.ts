import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import type { RepairOrderRepository, NewRepairOrderRecord } from "../../application/repair-order-repository.js";
import type { RepairOrder, RepairStatusEvent } from "../../domain/repair-order.js";
import type { RepairStatus } from "../../domain/repair-status.js";
import { RepairOrderEntitySchema, RepairStatusEventEntitySchema } from "./repair-order-entity.js";

export class PostgresRepairOrderRepository implements RepairOrderRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(input: NewRepairOrderRecord): Promise<RepairOrder> {
    return this.dataSource.transaction(async (manager) => {
      const repair = await manager.getRepository(RepairOrderEntitySchema).save({ ...input, serialNumber: input.serialNumber || null, deliveredAccessories: input.deliveredAccessories || null, status: "received" });
      await manager.getRepository(RepairStatusEventEntitySchema).save({ id: randomUUID(), repairOrderId: repair.id, status: "received", note: "Orden recibida" });
      return repair;
    });
  }

  findAll(): Promise<readonly RepairOrder[]> {
    return this.dataSource.getRepository(RepairOrderEntitySchema).find({ order: { createdAt: "DESC" } });
  }

  findById(id: string): Promise<RepairOrder | undefined> {
    return this.dataSource.getRepository(RepairOrderEntitySchema).findOneBy({ id }).then((repair) => repair ?? undefined);
  }

  async changeStatus(id: string, status: RepairStatus, note?: string): Promise<RepairOrder | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RepairOrderEntitySchema);
      const repair = await repository.preload({ id, status });
      if (!repair) return undefined;
      const savedRepair = await repository.save(repair);
      await manager.getRepository(RepairStatusEventEntitySchema).save({ id: randomUUID(), repairOrderId: id, status, note: note || null });
      return savedRepair;
    });
  }

  findStatusHistory(repairOrderId: string): Promise<readonly RepairStatusEvent[]> {
    return this.dataSource.getRepository(RepairStatusEventEntitySchema).find({ where: { repairOrderId }, order: { createdAt: "ASC" } });
  }
}