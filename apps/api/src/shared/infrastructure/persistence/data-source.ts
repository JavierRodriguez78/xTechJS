import { DataSource } from "typeorm";
import { loadConfig } from "../config/app-config.js";
import { InitialCustomersMigration } from "../../../customers/infrastructure/persistence/migrations/1735948800000-initial-customers.js";
import { CustomerEntitySchema } from "../../../customers/infrastructure/persistence/customer-entity.js";
import { InitialRepairOrdersMigration } from "../../../repairs/infrastructure/persistence/migrations/1736121600000-initial-repair-orders.js";
import { RepairOrderEntitySchema, RepairStatusEventEntitySchema } from "../../../repairs/infrastructure/persistence/repair-order-entity.js";
import { AddUserPasswordHashMigration } from "../../../users/infrastructure/persistence/migrations/1736035200000-add-user-password-hash.js";
import { InitialUsersMigration } from "../../../users/infrastructure/persistence/migrations/1735862400000-initial-users.js";
import { UserEntitySchema } from "../../../users/infrastructure/persistence/user-entity.js";

const config = loadConfig();

export const appDataSource = new DataSource({
  type: "postgres",
  host: config.get("POSTGRES_HOST"),
  port: config.get("POSTGRES_PORT"),
  database: config.get("POSTGRES_DB"),
  username: config.get("POSTGRES_USER"),
  password: config.get("POSTGRES_PASSWORD"),
  entities: [UserEntitySchema, CustomerEntitySchema, RepairOrderEntitySchema, RepairStatusEventEntitySchema],
  migrations: [InitialUsersMigration, InitialCustomersMigration, AddUserPasswordHashMigration, InitialRepairOrdersMigration],
  synchronize: false
});

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