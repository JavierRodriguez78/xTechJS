import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Service } from "@xtaskjs/core";
import type { AttachmentStorage } from "../../application/attachment-storage.js";
import { loadConfig } from "../../../shared/infrastructure/config/app-config.js";

@Service({ name: "attachmentStorage" })
export class LocalDiskAttachmentStorage implements AttachmentStorage {
  private readonly rootDir = resolve(loadConfig().get("UPLOADS_DIR"));

  async save(storageKey: string, stream: Readable): Promise<number> {
    const filePath = this.resolvePath(storageKey);
    await mkdir(dirname(filePath), { recursive: true });
    let bytes = 0;
    stream.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
    });
    await pipeline(stream, createWriteStream(filePath));
    return bytes;
  }

  read(storageKey: string): Readable {
    return createReadStream(this.resolvePath(storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    await rm(this.resolvePath(storageKey), { force: true });
  }

  // Defense in depth: storageKey is generated server-side, but never trust a path join blindly.
  private resolvePath(storageKey: string): string {
    const filePath = resolve(this.rootDir, storageKey);
    if (!filePath.startsWith(this.rootDir)) throw new Error("Invalid storage key");
    return filePath;
  }
}
