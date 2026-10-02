import { EntitySchema } from "typeorm";
import type { RepairAttachment } from "../../domain/repair-attachment.js";

export const RepairAttachmentEntitySchema = new EntitySchema<RepairAttachment>({
  name: "RepairAttachment",
  tableName: "repair_attachments",
  columns: {
    id: { type: "uuid", primary: true },
    repairOrderId: { type: "uuid", name: "repair_order_id", nullable: true },
    repairStepId: { type: "uuid", name: "repair_step_id", nullable: true },
    ecommerceProductId: { type: "uuid", name: "ecommerce_product_id", nullable: true },
    tradeInRequestId: { type: "uuid", name: "trade_in_request_id", nullable: true },
    uploaderId: { type: "uuid", name: "uploader_id" },
    uploaderRole: { type: String, name: "uploader_role" },
    fileName: { type: String, name: "file_name" },
    mimeType: { type: String, name: "mime_type" },
    sizeBytes: { type: "bigint", name: "size_bytes" },
    storageKey: { type: String, name: "storage_key" },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true }
  }
});
