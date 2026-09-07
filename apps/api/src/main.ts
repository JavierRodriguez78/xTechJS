import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { loadConfig } from "./shared/infrastructure/config/app-config.js";
import { appDataSource } from "./shared/infrastructure/persistence/data-source.js";
import { AuthenticationService } from "./users/application/authentication-service.js";
import { ListUsers } from "./users/application/list-users.js";
import { PERMISSIONS } from "./users/domain/permission.js";
import { registerAuthRoutes, requirePermission } from "./users/infrastructure/http/auth-routes.js";
import { PostgresUserRepository } from "./users/infrastructure/persistence/postgres-user-repository.js";

const app = Fastify({ logger: true });
const config = loadConfig();
const userRepository = new PostgresUserRepository(appDataSource);
const listUsers = new ListUsers(userRepository);
const authenticationService = new AuthenticationService(userRepository);

await app.register(jwt, { secret: config.get("JWT_SECRET"), sign: { expiresIn: config.get("JWT_EXPIRES_IN") } });

app.get("/health", async () => ({
  status: "ok",
  service: "xtechjs-api",
  timestamp: new Date().toISOString()
}));

registerAuthRoutes(app, authenticationService, appDataSource);

app.get("/api/users", { preHandler: requirePermission(PERMISSIONS.usersManage) }, async () => listUsers.execute());

const port = config.get("API_PORT");

try {
  await appDataSource.initialize();
  await app.listen({ port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}