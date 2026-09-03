import { DataSource } from "typeorm";
import { loadConfig } from "../config/app-config.js";
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
  entities: [UserEntitySchema],
  migrations: [InitialUsersMigration],
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