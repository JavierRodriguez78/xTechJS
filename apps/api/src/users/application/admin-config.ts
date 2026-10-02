import { Service } from "@xtaskjs/core";
import { InjectDataSource, type DataSource } from "@xtaskjs/typeorm";
import { AUTOMATED_REPAIR_STATUSES, REPAIR_STATUSES } from "../../repairs/domain/repair-status.js";
import type { RepairDeviceCatalogEntry } from "../../repairs/domain/repair-device-catalog.js";
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

type ConfigKey = "repairStatuses" | "deviceTypes" | "repairDeviceCatalog";

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
  private readonly fallback: Record<ConfigKey, unknown[]> = {
    repairStatuses: [...REPAIR_STATUSES],
    deviceTypes: [...defaultDeviceTypes],
    repairDeviceCatalog: []
  };

  listRepairStatuses(): Promise<readonly string[]> {
    return this.readStrings("repairStatuses");
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
    return this.readStrings("deviceTypes");
  }

  addDeviceType(value: string): Promise<void> {
    return this.add("deviceTypes", value);
  }

  removeDeviceType(value: string): Promise<void> {
    return this.remove("deviceTypes", value);
  }

  async listRepairDeviceCatalog(): Promise<readonly RepairDeviceCatalogEntry[]> {
    const values = await this.read("repairDeviceCatalog");
    return values.filter((value): value is RepairDeviceCatalogEntry => isCatalogEntry(value));
  }

  async addRepairDeviceCatalogEntry(input: RepairDeviceCatalogEntry): Promise<void> {
    const entry = { deviceType: input.deviceType.trim(), brand: input.brand.trim(), model: input.model.trim(), imageUrl: input.imageUrl?.trim() || undefined };
    const current = await this.listRepairDeviceCatalog();
    if (current.some((value) => value.deviceType === entry.deviceType && value.brand === entry.brand && value.model === entry.model)) return;
    await this.addDeviceType(entry.deviceType);
    await this.write("repairDeviceCatalog", [...current, entry]);
  }

  async removeRepairDeviceCatalogEntry(input: Pick<RepairDeviceCatalogEntry, "deviceType" | "brand" | "model">): Promise<void> {
    const current = await this.listRepairDeviceCatalog();
    await this.write("repairDeviceCatalog", current.filter((value) => value.deviceType !== input.deviceType || value.brand !== input.brand || value.model !== input.model));
  }

  private async add(key: "repairStatuses" | "deviceTypes", value: string): Promise<void> {
    const normalized = value.trim();
    if (!normalized) return;
    const current = await this.readStrings(key);
    if (current.includes(normalized)) return;
    await this.write(key, [...current, normalized]);
  }

  private async remove(key: "repairStatuses" | "deviceTypes", value: string): Promise<void> {
    const current = await this.readStrings(key);
    await this.write(key, current.filter((entry) => entry !== value));
  }

  private async readStrings(key: "repairStatuses" | "deviceTypes"): Promise<readonly string[]> {
    return (await this.read(key)).filter((value): value is string => typeof value === "string");
  }

  private async read(key: ConfigKey): Promise<readonly unknown[]> {
    if (!this.dataSource) return [...this.fallback[key]];
    const repository = this.dataSource.getRepository(AdminConfigEntitySchema);
    const record = await repository.findOneBy({ key });
    if (record && Array.isArray(record.values)) return record.values;
    await repository.save({ key, values: this.fallback[key] });
    return [...this.fallback[key]];
  }

  private async write(key: ConfigKey, values: unknown[]): Promise<void> {
    if (!this.dataSource) {
      this.fallback[key] = values;
      return;
    }
    await this.dataSource.getRepository(AdminConfigEntitySchema).save({ key, values });
  }
}

function isCatalogEntry(value: unknown): value is RepairDeviceCatalogEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<RepairDeviceCatalogEntry>;
  return typeof entry.deviceType === "string" && typeof entry.brand === "string" && typeof entry.model === "string" && (entry.imageUrl === undefined || typeof entry.imageUrl === "string");
}
