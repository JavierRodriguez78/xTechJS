import { ConfigService } from "@xtaskjs/config";
import { z } from "zod";

const environmentSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  POSTGRES_HOST: z.string().min(1).default("localhost"),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  POSTGRES_DB: z.string().min(1).default("xtechjs"),
  POSTGRES_USER: z.string().min(1).default("xtechjs"),
  POSTGRES_PASSWORD: z.string().min(1).default("change-me"),
  REDIS_HOST: z.string().min(1).default("localhost"),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379)
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function loadConfig(environment = process.env): ConfigService<AppConfig> {
  return new ConfigService(environmentSchema.parse(environment));
}