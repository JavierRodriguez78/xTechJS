import { Body, Controller, Post, Req, Res } from "@xtaskjs/common";
import type { FastifyRequest } from "fastify";
import { z } from "zod";

const frontendTraceSchema = z.object({
  correlationId: z.string().uuid(),
  phase: z.enum(["started", "completed", "failed"]),
  method: z.string().trim().min(1).max(10),
  path: z.string().trim().startsWith("/").max(500),
  status: z.number().int().min(100).max(599).optional()
});

type ControllerReply = { code(statusCode: number): { send(payload?: unknown): unknown } };

@Controller("/api/observability")
export class ObservabilityController {
  @Post("/frontend-trace")
  receiveFrontendTrace(@Body() body: unknown, @Req() request: FastifyRequest, @Res() reply: ControllerReply): unknown {
    const parsed = frontendTraceSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid frontend trace" });

    request.log.info({ traceSource: "frontend", ...parsed.data }, "Frontend operation");
    return reply.code(204).send();
  }
}