import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { CreateApplication, type Container, type XTaskHttpApplication } from "@xtaskjs/core";
import { FastifyAdapter } from "@xtaskjs/fastify-http";
import "./shared/infrastructure/config/app-config.js";
import { loadConfig } from "./shared/infrastructure/config/app-config.js";
import "./shared/infrastructure/cqrs/cqrs-configuration.js";
import "./shared/infrastructure/persistence/data-source.js";
import "./users/application/cqrs/user-handlers.js";
import "./users/infrastructure/http/auth-routes.js";
import "./users/infrastructure/http/user-controller.js";
import "./users/infrastructure/persistence/postgres-user-repository.js";
import "./customers/application/cqrs/customer-handlers.js";
import "./customers/infrastructure/http/customer-controller.js";
import "./customers/infrastructure/persistence/postgres-customer-repository.js";
import "./repairs/application/cqrs/repair-handlers.js";
import "./repairs/infrastructure/http/repair-controller.js";
import "./repairs/infrastructure/persistence/postgres-repair-order-repository.js";
import "./repairs/infrastructure/persistence/postgres-repair-quote-repository.js";

let application: XTaskHttpApplication | undefined;
const requiredComponentNames = ["userRepository", "customerRepository", "repairOrderRepository", "repairQuoteRepository"] as const;

export function assertRequiredComponents(container: Pick<Container, "getByName">): void {
  for (const name of requiredComponentNames) container.getByName(name);
}

export async function createApplication(): Promise<XTaskHttpApplication> {
  if (application) return application;

  const config = loadConfig();
  const fastify = Fastify({ logger: true });
  await fastify.register(jwt, { secret: config.get("JWT_SECRET"), sign: { expiresIn: config.get("JWT_EXPIRES_IN") } });
  fastify.get("/health", async () => ({ status: "ok", service: "xtechjs-api", timestamp: new Date().toISOString() }));

  application = await CreateApplication({
    adapter: new FastifyAdapter(fastify),
    container: { resolutionStrategy: "lazy" },
    prebuiltManifest: { enabled: true }
  });
  assertRequiredComponents(await application.getKernel().getContainer());
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
  application = undefined;
}