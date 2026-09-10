import { DataSource } from "typeorm";
import { registerTypeOrmDataSource, type XTaskTypeOrmDataSourceOptions } from "@xtaskjs/typeorm";
import { loadConfig } from "../config/app-config.js";
import { InitialCustomersMigration } from "../../../customers/infrastructure/persistence/migrations/1735948800000-initial-customers.js";
import { CustomerEntitySchema } from "../../../customers/infrastructure/persistence/customer-entity.js";
import { InitialRepairOrdersMigration } from "../../../repairs/infrastructure/persistence/migrations/1736121600000-initial-repair-orders.js";
import { AddRepairTechnicalDetailsMigration } from "../../../repairs/infrastructure/persistence/migrations/1736208000000-add-repair-technical-details.js";
import { InitialRepairQuotesMigration } from "../../../repairs/infrastructure/persistence/migrations/1736294400000-initial-repair-quotes.js";
import { RepairOrderEntitySchema, RepairStatusEventEntitySchema } from "../../../repairs/infrastructure/persistence/repair-order-entity.js";
import { RepairQuoteEntitySchema } from "../../../repairs/infrastructure/persistence/repair-quote-entity.js";
import { AddUserPasswordHashMigration } from "../../../users/infrastructure/persistence/migrations/1736035200000-add-user-password-hash.js";
import { InitialUsersMigration } from "../../../users/infrastructure/persistence/migrations/1735862400000-initial-users.js";
import { UserEntitySchema } from "../../../users/infrastructure/persistence/user-entity.js";
import { InventoryItemEntitySchema, InventoryMovementEntitySchema } from "../../../inventory/infrastructure/persistence/inventory-entity.js";
import { InitialInventoryMigration } from "../../../inventory/infrastructure/persistence/migrations/1736553600000-initial-inventory.js";

const config = loadConfig();

const dataSourceOptions: XTaskTypeOrmDataSourceOptions = {
  name: "default",
  type: "postgres",
  host: config.get("POSTGRES_HOST"),
  port: config.get("POSTGRES_PORT"),
  database: config.get("POSTGRES_DB"),
  username: config.get("POSTGRES_USER"),
  password: config.get("POSTGRES_PASSWORD"),
  entities: [UserEntitySchema, CustomerEntitySchema, RepairOrderEntitySchema, RepairStatusEventEntitySchema, RepairQuoteEntitySchema, InventoryItemEntitySchema, InventoryMovementEntitySchema],
  migrations: [InitialUsersMigration, InitialCustomersMigration, AddUserPasswordHashMigration, InitialRepairOrdersMigration, AddRepairTechnicalDetailsMigration, InitialRepairQuotesMigration, InitialInventoryMigration],
  synchronize: false,
  initializeOnServerStart: true,
  runMigrationsOnServerStart: true
};

registerTypeOrmDataSource(dataSourceOptions);

export const appDataSource = new DataSource(dataSourceOptions);

async function runMigrations(): Promise<void> {
  await appDataSource.initialize();
  await appDataSource.runMigrations();
  await appDataSource.destroy();
}

if (process.argv[1]?.endsWith("data-source.js")) {
  runMigrations().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}