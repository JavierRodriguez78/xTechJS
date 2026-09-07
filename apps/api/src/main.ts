import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { CreateCustomer } from "./customers/application/create-customer.js";
import { GetCustomer } from "./customers/application/get-customer.js";
import { ListCustomers } from "./customers/application/list-customers.js";
import { UpdateCustomer } from "./customers/application/update-customer.js";
import { registerCustomerRoutes } from "./customers/infrastructure/http/customer-routes.js";
import { PostgresCustomerRepository } from "./customers/infrastructure/persistence/postgres-customer-repository.js";
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
const customerRepository = new PostgresCustomerRepository(appDataSource);
const createCustomer = new CreateCustomer(customerRepository);
const listCustomers = new ListCustomers(customerRepository);
const getCustomer = new GetCustomer(customerRepository);
const updateCustomer = new UpdateCustomer(customerRepository);

await app.register(jwt, { secret: config.get("JWT_SECRET"), sign: { expiresIn: config.get("JWT_EXPIRES_IN") } });

app.get("/health", async () => ({
  status: "ok",
  service: "xtechjs-api",
  timestamp: new Date().toISOString()
}));

registerAuthRoutes(app, authenticationService, appDataSource);
registerCustomerRoutes(app, createCustomer, listCustomers, getCustomer, updateCustomer);

app.get("/api/users", { preHandler: requirePermission(PERMISSIONS.usersManage) }, async () => listUsers.execute());

const port = config.get("API_PORT");

try {
  await appDataSource.initialize();
  await app.listen({ port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}