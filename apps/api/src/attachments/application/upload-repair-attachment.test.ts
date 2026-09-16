import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import type { RepairAttachmentRepository } from "./repair-attachment-repository.js";
import type { RepairOrderRepository } from "../../repairs/application/repair-order-repository.js";
import type { AttachmentStorage } from "./attachment-storage.js";
import { UploadRepairAttachment } from "./upload-repair-attachment.js";

function fakeStorage(bytesToReport = 3): AttachmentStorage {
  return {
    async save() { return bytesToReport; },
    read() { return Readable.from([]); },
    async delete() {}
  };
}

test("an attachment is stored and persisted when the repair order exists and the type is allowed", async () => {
  const saved: unknown[] = [];
  const attachments: RepairAttachmentRepository = {
    async create(record) { saved.push(record); return { ...record, createdAt: new Date() }; },
    async findById() { return undefined; },
    async listByRepairOrder() { return []; },
    async delete() {}
  };
  const repairs = { async findById() { return { id: "repair-1" }; } } as unknown as RepairOrderRepository;

  const attachment = await new UploadRepairAttachment(attachments, repairs, fakeStorage(42)).execute({
    repairOrderId: "repair-1",
    uploaderId: "tech-1",
    uploaderRole: "technician",
    fileName: "foto.jpg",
    mimeType: "image/jpeg",
    stream: Readable.from(["data"])
  });

  assert.equal(attachment?.sizeBytes, 42);
  assert.equal(saved.length, 1);
});

test("an unsupported file type is rejected before touching storage", async () => {
  const attachments: RepairAttachmentRepository = {
    async create() { throw new Error("must not persist"); },
    async findById() { return undefined; },
    async listByRepairOrder() { return []; },
    async delete() {}
  };
  const repairs = { async findById() { return { id: "repair-1" }; } } as unknown as RepairOrderRepository;
  const storage: AttachmentStorage = { async save() { throw new Error("must not save"); }, read() { return Readable.from([]); }, async delete() {} };

  await assert.rejects(
    () => new UploadRepairAttachment(attachments, repairs, storage).execute({
      repairOrderId: "repair-1",
      uploaderId: "tech-1",
      uploaderRole: "technician",
      fileName: "documento.pdf",
      mimeType: "application/pdf",
      stream: Readable.from(["data"])
    }),
    /Unsupported file type/
  );
});

test("an attachment upload is rejected when the repair order does not exist", async () => {
  const attachments: RepairAttachmentRepository = {
    async create() { throw new Error("must not persist"); },
    async findById() { return undefined; },
    async listByRepairOrder() { return []; },
    async delete() {}
  };
  const repairs = { async findById() { return undefined; } } as unknown as RepairOrderRepository;

  const attachment = await new UploadRepairAttachment(attachments, repairs, fakeStorage()).execute({
    repairOrderId: "missing",
    uploaderId: "tech-1",
    uploaderRole: "technician",
    fileName: "foto.jpg",
    mimeType: "image/jpeg",
    stream: Readable.from(["data"])
  });

  assert.equal(attachment, undefined);
});
