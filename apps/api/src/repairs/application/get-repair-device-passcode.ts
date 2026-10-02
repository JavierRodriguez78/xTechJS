import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { RepairDeviceSecretEntitySchema } from "../infrastructure/persistence/repair-order-entity.js";
import { DevicePasscodeCipher } from "./device-passcode-cipher.js";

@Traceable("GetRepairDevicePasscode")
@Service()
export class GetRepairDevicePasscode {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  constructor(private readonly cipher: DevicePasscodeCipher) {}

  async execute(repairOrderId: string): Promise<string | undefined> {
    const secret = await this.dataSource.getRepository(RepairDeviceSecretEntitySchema).findOneBy({ repairOrderId });
    return secret ? this.cipher.decrypt(secret.encryptedPasscode) : undefined;
  }
}