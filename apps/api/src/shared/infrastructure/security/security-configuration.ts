import { registerJwtStrategy } from "@xtaskjs/security";
import { loadConfig } from "../config/app-config.js";

const config = loadConfig();

registerJwtStrategy({
  default: true,
  secretOrKey: config.get("JWT_SECRET"),
  extractRoles: (claims) => typeof claims.role === "string" ? [claims.role] : []
});