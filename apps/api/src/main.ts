import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { CreateCustomer } from "./customers/application/create-customer.js";
import { GetCustomer } from "./customers/application/get-customer.js";
import { ListCustomers } from "./customers/application/list-customers.js";
import { UpdateCustomer } from "./customers/application/update-customer.js";
import { registerCustomerRoutes } from "./customers/infrastructure/http/customer-routes.js";
import { PostgresCustomerRepository } from "./customers/infrastructure/persistence/postgres-customer-repository.js";
import { ChangeRepairStatus } from "./repairs/application/change-repair-status.js";
import { ApproveRepairQuote } from "./repairs/application/approve-repair-quote.js";
import { CreateRepairOrder } from "./repairs/application/create-repair-order.js";
import { GetRepairStatusHistory } from "./repairs/application/get-repair-status-history.js";
import { GetRepairQuote } from "./repairs/application/get-repair-quote.js";
import { ListRepairOrders } from "./repairs/application/list-repair-orders.js";
import { SaveRepairQuote } from "./repairs/application/save-repair-quote.js";
import { UpdateRepairTechnical } from "./repairs/application/update-repair-technical.js";
import { registerRepairRoutes } from "./repairs/infrastructure/http/repair-routes.js";
import { PostgresRepairOrderRepository } from "./repairs/infrastructure/persistence/postgres-repair-order-repository.js";
import { PostgresRepairQuoteRepository } from "./repairs/infrastructure/persistence/postgres-repair-quote-repository.js";
import { loadConfig } from "./shared/infrastructure/config/app-config.js";
import { appDataSource } from "./shared/infrastructure/persistence/data-source.js";
import { AuthenticationService } from "./users/application/authentication-service.js";
import { ListTechnicians } from "./users/application/list-technicians.js";
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
const repairRepository = new PostgresRepairOrderRepository(appDataSource);
const createRepair = new CreateRepairOrder(repairRepository);
const listRepairs = new ListRepairOrders(repairRepository);
const changeRepairStatus = new ChangeRepairStatus(repairRepository);
const getRepairStatusHistory = new GetRepairStatusHistory(repairRepository);
const quoteRepository = new PostgresRepairQuoteRepository(appDataSource);
const getRepairQuote = new GetRepairQuote(quoteRepository);
const saveRepairQuote = new SaveRepairQuote(quoteRepository, repairRepository, changeRepairStatus);
const approveRepairQuote = new ApproveRepairQuote(quoteRepository, changeRepairStatus);
const updateRepairTechnical = new UpdateRepairTechnical(repairRepository, userRepository);
const listTechnicians = new ListTechnicians(userRepository);

await app.register(jwt, { secret: config.get("JWT_SECRET"), sign: { expiresIn: config.get("JWT_EXPIRES_IN") } });

app.get("/health", async () => ({
  status: "ok",
  service: "xtechjs-api",
  timestamp: new Date().toISOString()
}));

registerAuthRoutes(app, authenticationService, appDataSource);
registerCustomerRoutes(app, createCustomer, listCustomers, getCustomer, updateCustomer);
registerRepairRoutes(app, createRepair, listRepairs, changeRepairStatus, getRepairStatusHistory, updateRepairTechnical, getRepairQuote, saveRepairQuote, approveRepairQuote);

app.get("/api/users", { preHandler: requirePermission(PERMISSIONS.usersManage) }, async () => listUsers.execute());
app.get("/api/technicians", { preHandler: requirePermission(PERMISSIONS.repairsManage) }, async () => listTechnicians.execute());

const port = config.get("API_PORT");

try {
  await appDataSource.initialize();
  await app.listen({ port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}