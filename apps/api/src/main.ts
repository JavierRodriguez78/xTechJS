import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { CreateApplication } from "@xtaskjs/core";
import { CommandBus, getCommandBusToken, getQueryBusToken, QueryBus } from "@xtaskjs/cqrs";
import { FastifyAdapter } from "@xtaskjs/fastify-http";
import { getTypeOrmLifecycleManager } from "@xtaskjs/typeorm";
import "./shared/infrastructure/cqrs/cqrs-configuration.js";
import "./users/application/cqrs/user-handlers.js";
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
import "./shared/infrastructure/persistence/data-source.js";
import { ListTechniciansQuery, ListUsersQuery } from "./users/application/cqrs/user-messages.js";
import { PERMISSIONS } from "./users/domain/permission.js";
import { registerAuthRoutes, requirePermission } from "./users/infrastructure/http/auth-routes.js";
import { PostgresUserRepository } from "./users/infrastructure/persistence/postgres-user-repository.js";

const app = Fastify({ logger: true });
const config = loadConfig();

await app.register(jwt, { secret: config.get("JWT_SECRET"), sign: { expiresIn: config.get("JWT_EXPIRES_IN") } });
const xtaskApplication = await CreateApplication({ adapter: new FastifyAdapter(app), container: { resolutionStrategy: "lazy" }, prebuiltManifest: { enabled: true } });
const container = await xtaskApplication.getKernel().getContainer();
const dataSource = getTypeOrmLifecycleManager().getDataSource("default");
const commandBus = container.getByName<CommandBus>(getCommandBusToken());
const queryBus = container.getByName<QueryBus>(getQueryBusToken());
const userRepository = new PostgresUserRepository(dataSource);
const customerRepository = new PostgresCustomerRepository(dataSource);
const createCustomer = new CreateCustomer(customerRepository);
const listCustomers = new ListCustomers(customerRepository);
const getCustomer = new GetCustomer(customerRepository);
const updateCustomer = new UpdateCustomer(customerRepository);
const repairRepository = new PostgresRepairOrderRepository(dataSource);
const createRepair = new CreateRepairOrder(repairRepository);
const listRepairs = new ListRepairOrders(repairRepository);
const changeRepairStatus = new ChangeRepairStatus(repairRepository);
const getRepairStatusHistory = new GetRepairStatusHistory(repairRepository);
const quoteRepository = new PostgresRepairQuoteRepository(dataSource);
const getRepairQuote = new GetRepairQuote(quoteRepository);
const saveRepairQuote = new SaveRepairQuote(quoteRepository, repairRepository, changeRepairStatus);
const approveRepairQuote = new ApproveRepairQuote(quoteRepository, changeRepairStatus);
const updateRepairTechnical = new UpdateRepairTechnical(repairRepository, userRepository);

app.get("/health", async () => ({
  status: "ok",
  service: "xtechjs-api",
  timestamp: new Date().toISOString()
}));

registerAuthRoutes(app, dataSource, commandBus, queryBus);
registerCustomerRoutes(app, createCustomer, listCustomers, getCustomer, updateCustomer);
registerRepairRoutes(app, createRepair, listRepairs, changeRepairStatus, getRepairStatusHistory, updateRepairTechnical, getRepairQuote, saveRepairQuote, approveRepairQuote);

app.get("/api/users", { preHandler: requirePermission(PERMISSIONS.usersManage) }, async () => queryBus.execute(new ListUsersQuery()));
app.get("/api/technicians", { preHandler: requirePermission(PERMISSIONS.repairsManage) }, async () => queryBus.execute(new ListTechniciansQuery()));

const port = config.get("API_PORT");

try {
  await xtaskApplication.listen({ port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}