import { registerMailerTransport } from "@xtaskjs/mailer";
import { loadConfig } from "../config/app-config.js";

const config = loadConfig();

registerMailerTransport({
  name: "default",
  defaults: {
    from: config.get("MAIL_FROM")
  },
  transport: {
    host: config.get("SMTP_HOST"),
    port: config.get("SMTP_PORT"),
    secure: config.get("SMTP_SECURE"),
    ignoreTLS: !config.get("SMTP_SECURE"),
    auth: config.get("SMTP_USER") || config.get("SMTP_PASSWORD")
      ? { user: config.get("SMTP_USER") || undefined, pass: config.get("SMTP_PASSWORD") || undefined }
      : undefined
  },
  verifyOnStart: true
});
