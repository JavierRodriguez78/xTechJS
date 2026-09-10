import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { CreateApplication, type Container, type XTaskHttpApplication } from "@xtaskjs/core";
import { getCommandBusToken, getQueryBusToken, type CommandBus, type QueryBus } from "@xtaskjs/cqrs";
import { FastifyAdapter } from "@xtaskjs/fastify-http";
import { initializeSecurityIntegration, shutdownSecurityIntegration } from "@xtaskjs/security";
import "./shared/infrastructure/config/app-config.js";
import { loadConfig } from "./shared/infrastructure/config/app-config.js";
import "./shared/infrastructure/cqrs/cqrs-configuration.js";
import "./shared/infrastructure/http/observability-controller.js";
import "./shared/infrastructure/persistence/data-source.js";
import "./shared/infrastructure/security/security-configuration.js";
import "./users/application/cqrs/user-handlers.js";
import "./users/infrastructure/http/auth-routes.js";
import "./users/infrastructure/http/user-controller.js";
import "./users/infrastructure/persistence/postgres-user-repository.js";
import "./customers/application/cqrs/customer-handlers.js";
import "./customers/infrastructure/http/customer-controller.js";
import "./customers/infrastructure/persistence/postgres-customer-repository.js";
import "./repairs/application/cqrs/repair-handlers.js";
import "./repairs/infrastructure/http/repair-controller.js";
import "./repairs/infrastructure/http/customer-repair-controller.js";
import "./repairs/infrastructure/persistence/postgres-repair-order-repository.js";
import "./repairs/infrastructure/persistence/postgres-repair-quote-repository.js";
import "./inventory/application/cqrs/inventory-handlers.js";
import "./inventory/infrastructure/http/inventory-controller.js";
import "./inventory/infrastructure/http/supplier-controller.js";
import "./inventory/infrastructure/persistence/postgres-inventory-repository.js";
import "./inventory/application/cqrs/supplier-handlers.js";
import "./inventory/infrastructure/persistence/postgres-supplier-repository.js";
import "./inventory/application/cqrs/purchase-order-handlers.js";
import "./inventory/infrastructure/http/purchase-order-controller.js";
import "./inventory/infrastructure/persistence/postgres-purchase-order-repository.js";
import "./payments/application/cqrs/payment-handlers.js";
import "./payments/infrastructure/http/payment-controller.js";
import "./payments/infrastructure/persistence/postgres-payment-repository.js";
import { startTrace, traceOperation } from "./shared/infrastructure/observability/trace.js";

declare module "fastify" {
  interface FastifyRequest {
    correlationId: string;
  }
}

let application: XTaskHttpApplication | undefined;
const requiredComponentNames = ["userRepository", "customerRepository", "repairOrderRepository", "repairQuoteRepository", "inventoryRepository", "supplierRepository", "purchaseOrderRepository", "paymentRepository"] as const;

function instrumentBus(bus: CommandBus | QueryBus, component: "CommandBus" | "QueryBus"): void {
  const execute = bus.execute.bind(bus);
  bus.execute = (async <TResult>(message: object): Promise<TResult> => traceOperation(component, message.constructor.name, () => execute(message) as Promise<TResult>)) as typeof bus.execute;
}

export function assertRequiredComponents(container: Pick<Container, "getByName">): void {
  for (const name of requiredComponentNames) container.getByName(name);
}

export async function createApplication(): Promise<XTaskHttpApplication> {
  if (application) return application;

  const config = loadConfig();
  const fastify = Fastify({ logger: true, requestIdHeader: "x-correlation-id", genReqId: () => randomUUID() });
  fastify.addHook("onRequest", async (request, reply) => {
    request.correlationId = request.id;
    reply.header("x-correlation-id", request.correlationId);
    startTrace(request.correlationId, request.log);
    request.log.info({ correlationId: request.correlationId }, "Request started");
  });
  fastify.addHook("onError", async (request, _reply, error) => {
    request.log.error({ correlationId: request.correlationId, err: error }, "Request failed");
  });
  fastify.addHook("onResponse", async (request, reply) => {
    request.log.info({ correlationId: request.correlationId, statusCode: reply.statusCode }, "Request completed");
  });
  await fastify.register(jwt, { secret: config.get("JWT_SECRET"), sign: { expiresIn: config.get("JWT_EXPIRES_IN") } });
  fastify.get("/health", async () => ({ status: "ok", service: "xtechjs-api", timestamp: new Date().toISOString() }));

  application = await CreateApplication({
    adapter: new FastifyAdapter(fastify),
    container: { resolutionStrategy: "lazy" },
    prebuiltManifest: { enabled: true }
  });
  const container = await application.getKernel().getContainer();
  await initializeSecurityIntegration(container);
  assertRequiredComponents(container);
  instrumentBus(container.getByName<CommandBus>(getCommandBusToken()), "CommandBus");
  instrumentBus(container.getByName<QueryBus>(getQueryBusToken()), "QueryBus");
  return application;
}

export async function startApplication(): Promise<XTaskHttpApplication> {
  const current = await createApplication();
  const port = loadConfig().get("API_PORT");
  await current.listen({ port, host: "0.0.0.0" });
  return current;
}

export async function stopApplication(): Promise<void> {
  await application?.close();
  await shutdownSecurityIntegration();
  application = undefined;
}