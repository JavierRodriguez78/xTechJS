import { Service } from "@xtaskjs/core";
import { InjectDataSource, type DataSource } from "@xtaskjs/typeorm";
import { AUTOMATED_REPAIR_STATUSES, REPAIR_STATUSES } from "../../repairs/domain/repair-status.js";
import { AdminConfigEntitySchema } from "../infrastructure/persistence/admin-config-entity.js";

const defaultDeviceTypes = [
  "Consola",
  "Móvil",
  "Portátil",
  "Televisor",
  "Electrodoméstico",
  "Audio",
  "Accesorio",
  "Otros"
] as const;

type ConfigKey = "repairStatuses" | "deviceTypes";

export class ProtectedConfigValueError extends Error {
  constructor(readonly value: string, reason: string) {
    super(reason);
    this.name = "ProtectedConfigValueError";
  }
}

@Service()
export class AdminConfigService {
  @InjectDataSource()
  private readonly dataSource?: DataSource;
  private readonly fallback: Record<ConfigKey, string[]> = {
    repairStatuses: [...REPAIR_STATUSES],
    deviceTypes: [...defaultDeviceTypes]
  };

  listRepairStatuses(): Promise<readonly string[]> {
    return this.read("repairStatuses");
  }

  addRepairStatus(value: string): Promise<void> {
    return this.add("repairStatuses", value);
  }

  async removeRepairStatus(value: string): Promise<void> {
    if (AUTOMATED_REPAIR_STATUSES.includes(value as (typeof AUTOMATED_REPAIR_STATUSES)[number])) {
      throw new ProtectedConfigValueError(value, `El estado "${value}" lo usan los flujos automaticos de presupuesto y no puede eliminarse.`);
    }
    return this.remove("repairStatuses", value);
  }

  listDeviceTypes(): Promise<readonly string[]> {
    return this.read("deviceTypes");
  }

  addDeviceType(value: string): Promise<void> {
    return this.add("deviceTypes", value);
  }

  removeDeviceType(value: string): Promise<void> {
    return this.remove("deviceTypes", value);
  }

  private async add(key: ConfigKey, value: string): Promise<void> {
    const normalized = value.trim();
    if (!normalized) return;
    const current = await this.read(key);
    if (current.includes(normalized)) return;
    await this.write(key, [...current, normalized]);
  }

  private async remove(key: ConfigKey, value: string): Promise<void> {
    const current = await this.read(key);
    await this.write(key, current.filter((entry) => entry !== value));
  }

  private async read(key: ConfigKey): Promise<readonly string[]> {
    if (!this.dataSource) return [...this.fallback[key]];
    const repository = this.dataSource.getRepository(AdminConfigEntitySchema);
    const record = await repository.findOneBy({ key });
    if (record) return record.values;
    await repository.save({ key, values: this.fallback[key] });
    return [...this.fallback[key]];
  }

  private async write(key: ConfigKey, values: string[]): Promise<void> {
    if (!this.dataSource) {
      this.fallback[key] = values;
      return;
    }
    await this.dataSource.getRepository(AdminConfigEntitySchema).save({ key, values });
  }
}
