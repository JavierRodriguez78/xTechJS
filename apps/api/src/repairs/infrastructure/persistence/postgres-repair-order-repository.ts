import { randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { RepairOrderListOptions, RepairOrderPage, RepairOrderRepository, NewRepairOrderRecord } from "../../application/repair-order-repository.js";
import type { RepairOrder, RepairStatusEvent } from "../../domain/repair-order.js";
import type { RepairStatus } from "../../domain/repair-status.js";
import { RepairConditionRecordEntitySchema, RepairDeviceSecretEntitySchema, RepairOrderEntitySchema, RepairStatusEventEntitySchema } from "./repair-order-entity.js";

@Traceable("PostgresRepairOrderRepository")
@Service({ name: "repairOrderRepository" })
export class PostgresRepairOrderRepository implements RepairOrderRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async create(input: NewRepairOrderRecord): Promise<RepairOrder> {
    return this.dataSource.transaction(async (manager) => {
      const { devicePasscodeEncrypted, preRepairCondition, recordedByUserId, ...repairInput } = input;
      const repair = await manager.getRepository(RepairOrderEntitySchema).save({ ...repairInput, serialNumber: input.serialNumber || null, deliveredAccessories: input.deliveredAccessories || null, technicianId: input.technicianId || null, estimatedCompletionAt: input.estimatedCompletionAt || null, diagnosis: null, status: "received" });
      await manager.getRepository(RepairStatusEventEntitySchema).save({ id: randomUUID(), repairOrderId: repair.id, status: "received", note: "Orden recibida" });
      if (devicePasscodeEncrypted) await manager.getRepository(RepairDeviceSecretEntitySchema).save({ repairOrderId: repair.id, encryptedPasscode: devicePasscodeEncrypted });
      if (preRepairCondition) await manager.getRepository(RepairConditionRecordEntitySchema).save({ id: randomUUID(), repairOrderId: repair.id, phase: "pre_repair", checklist: preRepairCondition, recordedByUserId });
      return repair;
    });
  }

  findAll(): Promise<readonly RepairOrder[]> {
    return this.dataSource.getRepository(RepairOrderEntitySchema).find({ order: { createdAt: "DESC" } });
  }

  async findPage(options: RepairOrderListOptions): Promise<RepairOrderPage> {
    const query = this.dataSource.getRepository(RepairOrderEntitySchema).createQueryBuilder("repair");
    if (options.query) {
      query.andWhere("(repair.brand ILIKE :query OR repair.model ILIKE :query OR repair.device_type ILIKE :query OR repair.serial_number ILIKE :query OR repair.reported_issue ILIKE :query)", { query: `%${options.query}%` });
    }
    if (options.status) query.andWhere("repair.status = :status", { status: options.status });
    if (options.technicianId) query.andWhere("repair.technician_id = :technicianId", { technicianId: options.technicianId });
    if (options.deviceType) query.andWhere("repair.device_type = :deviceType", { deviceType: options.deviceType });
    if (options.customerId) query.andWhere("repair.customer_id = :customerId", { customerId: options.customerId });
    if (options.receivedFrom) query.andWhere("repair.created_at >= :receivedFrom", { receivedFrom: options.receivedFrom });
    if (options.receivedTo) query.andWhere("repair.created_at < :receivedTo", { receivedTo: options.receivedTo });
    const [field, rawDirection] = options.sort.split(":") as ["createdAt" | "brand", "asc" | "desc"];
    const direction = rawDirection.toUpperCase() as "ASC" | "DESC";
    const column = field === "brand" ? "repair.brand" : "repair.created_at";
    query.orderBy(column, direction).addOrderBy("repair.id", "ASC");
    const [items, total] = await query.skip((options.page - 1) * options.pageSize).take(options.pageSize).getManyAndCount();
    return { items, total, page: options.page, pageSize: options.pageSize };
  }

  findById(id: string): Promise<RepairOrder | undefined> {
    return this.dataSource.getRepository(RepairOrderEntitySchema).findOneBy({ id }).then((repair) => repair ?? undefined);
  }

  findByCustomerId(customerId: string): Promise<readonly RepairOrder[]> {
    return this.dataSource.getRepository(RepairOrderEntitySchema).find({ where: { customerId }, order: { createdAt: "DESC" } });
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

  async updateTechnical(id: string, input: { technicianId?: string; diagnosis?: string }): Promise<RepairOrder | undefined> {
    const repository = this.dataSource.getRepository(RepairOrderEntitySchema);
    const repair = await repository.preload({ id, ...input });
    return repair ? repository.save(repair) : undefined;
  }
}