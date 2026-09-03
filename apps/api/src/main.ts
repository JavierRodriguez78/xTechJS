import Fastify from "fastify";
import { loadConfig } from "./shared/infrastructure/config/app-config.js";
import { appDataSource } from "./shared/infrastructure/persistence/data-source.js";
import { ListUsers } from "./users/application/list-users.js";
import { PostgresUserRepository } from "./users/infrastructure/persistence/postgres-user-repository.js";

const app = Fastify({ logger: true });
const config = loadConfig();
const listUsers = new ListUsers(new PostgresUserRepository(appDataSource));

app.get("/health", async () => ({
  status: "ok",
  service: "xtechjs-api",
  timestamp: new Date().toISOString()
}));

app.get("/api/users", async () => listUsers.execute());

const port = config.get("API_PORT");

try {
  await appDataSource.initialize();
  await app.listen({ port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}