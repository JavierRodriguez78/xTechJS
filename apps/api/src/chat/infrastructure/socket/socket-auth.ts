import { createVerifier } from "fast-jwt";
import { loadConfig } from "../../../shared/infrastructure/config/app-config.js";
import type { AuthTokenPayload } from "../../../users/infrastructure/http/auth-routes.js";

let verifier: ReturnType<typeof createVerifier> | undefined;

function getVerifier(): ReturnType<typeof createVerifier> {
  if (!verifier) verifier = createVerifier({ key: loadConfig().get("JWT_SECRET") });
  return verifier;
}

// Same secret/claims as @fastify/jwt (request.server.jwt.sign), verified independently because the socket handshake has no Fastify request context.
export function verifySocketToken(token: string | undefined): AuthTokenPayload | undefined {
  if (!token) return undefined;
  try {
    return getVerifier()(token) as unknown as AuthTokenPayload;
  } catch {
    return undefined;
  }
}
