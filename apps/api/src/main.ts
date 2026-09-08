import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { CreateApplication } from "@xtaskjs/core";
import { CommandBus, getCommandBusToken, getQueryBusToken, QueryBus } from "@xtaskjs/cqrs";
import { FastifyAdapter } from "@xtaskjs/fastify-http";
import { getTypeOrmLifecycleManager } from "@xtaskjs/typeorm";
import "./shared/infrastructure/cqrs/cqrs-configuration.js";
import "./users/application/cqrs/user-handlers.js";
import "./users/infrastructure/http/user-controller.js";
import "./customers/application/cqrs/customer-handlers.js";
import "./customers/infrastructure/http/customer-controller.js";
import "./repairs/application/cqrs/repair-handlers.js";
import "./repairs/infrastructure/http/repair-controller.js";
import { PostgresCustomerRepository } from "./customers/infrastructure/persistence/postgres-customer-repository.js";
import { PostgresRepairOrderRepository } from "./repairs/infrastructure/persistence/postgres-repair-order-repository.js";
import { PostgresRepairQuoteRepository } from "./repairs/infrastructure/persistence/postgres-repair-quote-repository.js";
import { loadConfig } from "./shared/infrastructure/config/app-config.js";
import "./shared/infrastructure/persistence/data-source.js";
import { PostgresUserRepository } from "./users/infrastructure/persistence/postgres-user-repository.js";

const app = Fastify({ logger: true });
const config = loadConfig();

await app.register(jwt, { secret: config.get("JWT_SECRET"), sign: { expiresIn: config.get("JWT_EXPIRES_IN") } });
const xtaskApplication = await CreateApplication({ adapter: new FastifyAdapter(app), container: { resolutionStrategy: "lazy" }, prebuiltManifest: { enabled: true } });
const container = await xtaskApplication.getKernel().getContainer();
const dataSource = getTypeOrmLifecycleManager().getDataSource("default");
const commandBus = container.getByName<CommandBus>(getCommandBusToken());
const userRepository = new PostgresUserRepository(dataSource);
container.registerNamedInstance("userRepository", userRepository);
const customerRepository = new PostgresCustomerRepository(dataSource);
container.registerNamedInstance("customerRepository", customerRepository);
container.registerNamedInstance("repairOrderRepository", new PostgresRepairOrderRepository(dataSource));
container.registerNamedInstance("repairQuoteRepository", new PostgresRepairQuoteRepository(dataSource));

app.get("/health", async () => ({
  status: "ok",
  service: "xtechjs-api",
  timestamp: new Date().toISOString()
}));

const port = config.get("API_PORT");

try {
  await xtaskApplication.listen({ port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}