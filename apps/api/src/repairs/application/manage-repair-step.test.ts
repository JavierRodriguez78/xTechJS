import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { AddRepairStep, DeleteRepairStep, RepairStepAccessDeniedError, UpdateRepairStep } from "./manage-repair-step.js";
import type { RepairStepRepository } from "./repair-step-repository.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import type { RepairAttachmentRepository } from "../../attachments/application/repair-attachment-repository.js";
import type { AttachmentStorage } from "../../attachments/application/attachment-storage.js";

const repairOrders = { async findById(id: string) { return id === "repair-1" ? { id } : undefined; } } as unknown as RepairOrderRepository;

test("a repair step is sequenced and attributed to the authenticated technician", async () => {
  let saved: Record<string, unknown> | undefined;
  const steps = {
    async nextSequence() { return 3; },
    async create(record: Record<string, unknown>) { saved = record; return { ...record, createdAt: new Date(), updatedAt: new Date() }; }
  } as unknown as RepairStepRepository;

  const step = await new AddRepairStep(repairOrders, steps).execute("repair-1", "tech-1", { title: "  Sustitución de pieza  ", description: "  Completada  " });

  assert.equal(step?.sequence, 3);
  assert.deepEqual(saved && { repairOrderId: saved.repairOrderId, technicianId: saved.technicianId, title: saved.title, description: saved.description }, { repairOrderId: "repair-1", technicianId: "tech-1", title: "Sustitución de pieza", description: "Completada" });
});

test("only the author or an administrator can update a repair step", async () => {
  const steps = {
    async findById() { return { id: "step-1", repairOrderId: "repair-1", technicianId: "tech-1", title: "Paso", description: null, performedAt: new Date() }; },
    async update() { throw new Error("must not update"); }
  } as unknown as RepairStepRepository;

  await assert.rejects(
    () => new UpdateRepairStep(steps).execute("repair-1", "step-1", "tech-2", "technician", { title: "Otro" }),
    RepairStepAccessDeniedError
  );
});

test("deleting a repair step deletes its attachment files before the step", async () => {
  const operations: string[] = [];
  const steps = {
    async findById() { return { id: "step-1", repairOrderId: "repair-1", technicianId: "tech-1" }; },
    async delete(id: string) { operations.push(`step:${id}`); }
  } as unknown as RepairStepRepository;
  const attachments = {
    async listByRepairStep() { return [{ id: "attachment-1", storageKey: "repair-1/evidence.jpg" }]; },
    async delete(id: string) { operations.push(`attachment:${id}`); }
  } as unknown as RepairAttachmentRepository;
  const storage: AttachmentStorage = { async save() { return 0; }, read() { return Readable.from([]); }, async delete(key: string) { operations.push(`file:${key}`); } };

  const deleted = await new DeleteRepairStep(steps, attachments, storage).execute("repair-1", "step-1", "tech-1", "technician");

  assert.equal(deleted, true);
  assert.deepEqual(operations, ["file:repair-1/evidence.jpg", "attachment:attachment-1", "step:step-1"]);
});