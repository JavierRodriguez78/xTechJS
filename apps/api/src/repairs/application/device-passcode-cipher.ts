import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { loadConfig } from "../../shared/infrastructure/config/app-config.js";

@Service()
export class DevicePasscodeCipher {
  private readonly key = createHash("sha256").update(loadConfig().get("DEVICE_PASSCODE_ENCRYPTION_KEY")).digest();

  encrypt(value: string): string {
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, initializationVector);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [initializationVector, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
  }

  decrypt(value: string): string {
    const [initializationVector, authTag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
    if (!initializationVector || !authTag || !encrypted) throw new Error("Invalid encrypted device passcode");
    const decipher = createDecipheriv("aes-256-gcm", this.key, initializationVector);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
}