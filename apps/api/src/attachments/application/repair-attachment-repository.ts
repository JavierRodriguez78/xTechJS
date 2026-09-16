import type { RepairAttachment } from "../domain/repair-attachment.js";

export interface NewRepairAttachmentRecord {
  id: string;
  repairOrderId: string;
  uploaderId: string;
  uploaderRole: RepairAttachment["uploaderRole"];
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}

export interface RepairAttachmentRepository {
  create(record: NewRepairAttachmentRecord): Promise<RepairAttachment>;
  findById(id: string): Promise<RepairAttachment | undefined>;
  listByRepairOrder(repairOrderId: string): Promise<readonly RepairAttachment[]>;
  delete(id: string): Promise<void>;
}
