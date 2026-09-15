import { Service } from "@xtaskjs/core";
import { InjectDataSource, type DataSource } from "@xtaskjs/typeorm";
import { REPAIR_STATUSES } from "../../repairs/domain/repair-status.js";
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

@Service()
export class AdminConfigService {
  @InjectDataSource()
  private readonly dataSource?: DataSource;
  private repairStatuses: string[] = [...REPAIR_STATUSES];
  private deviceTypes: string[] = [...defaultDeviceTypes];
  private notificationTemplates: string[] = ["repair.completed", "repair.quoted", "repair.delivered"];

  async listRepairStatuses(): Promise<readonly string[]> {
    return this.read("repairStatuses", this.repairStatuses);
  }

  async addRepairStatus(value: string): Promise<void> {
    const normalized = value.trim();
    if (!normalized) return;
    await this.write("repairStatuses", [...(await this.listRepairStatuses()), ...(await this.listRepairStatuses()).includes(normalized) ? [] : [normalized]]);
  }

  async removeRepairStatus(value: string): Promise<void> {
    await this.write("repairStatuses", (await this.listRepairStatuses()).filter((status) => status !== value));
  }

  async listDeviceTypes(): Promise<readonly string[]> {
    return this.read("deviceTypes", this.deviceTypes);
  }

  async addDeviceType(value: string): Promise<void> {
    const normalized = value.trim();
    if (!normalized) return;
    await this.write("deviceTypes", [...(await this.listDeviceTypes()), ...(await this.listDeviceTypes()).includes(normalized) ? [] : [normalized]]);
  }

  async removeDeviceType(value: string): Promise<void> {
    await this.write("deviceTypes", (await this.listDeviceTypes()).filter((device) => device !== value));
  }

  async listNotificationTemplates(): Promise<readonly string[]> {
    return this.read("notificationTemplates", this.notificationTemplates);
  }

  async addNotificationTemplate(value: string): Promise<void> {
    const normalized = value.trim();
    if (!normalized) return;
    await this.write("notificationTemplates", [...(await this.listNotificationTemplates()), ...(await this.listNotificationTemplates()).includes(normalized) ? [] : [normalized]]);
  }

  async removeNotificationTemplate(value: string): Promise<void> {
    await this.write("notificationTemplates", (await this.listNotificationTemplates()).filter((template) => template !== value));
  }

  private async read(key: string, fallback: string[]): Promise<readonly string[]> {
    if (!this.dataSource) return [...fallback];
    const repository = this.dataSource.getRepository(AdminConfigEntitySchema);
    const record = await repository.findOneBy({ key });
    if (record) return record.values;
    await repository.save({ key, values: fallback });
    return [...fallback];
  }

  private async write(key: string, values: string[]): Promise<void> {
    if (!this.dataSource) {
      if (key === "repairStatuses") this.repairStatuses = values;
      if (key === "deviceTypes") this.deviceTypes = values;
      if (key === "notificationTemplates") this.notificationTemplates = values;
      return;
    }
    await this.dataSource.getRepository(AdminConfigEntitySchema).save({ key, values });
  }
}
