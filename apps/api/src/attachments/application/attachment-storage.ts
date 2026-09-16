import type { Readable } from "node:stream";

export interface AttachmentStorage {
  save(storageKey: string, stream: Readable): Promise<number>;
  read(storageKey: string): Readable;
  delete(storageKey: string): Promise<void>;
}
