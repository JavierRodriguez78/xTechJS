import { EntitySchema } from "typeorm";
import type { CustomerNotificationStatus } from "../../application/customer-notification-repository.js";

export interface CustomerNotificationEntityRecord {
  id: string;
  customerId: string;
  repairOrderId: string | null;
  templateKey: string;
  recipient: string;
  subject: string;
  status: CustomerNotificationStatus;
  errorMessage: string | null;
  createdAt: Date;
}

export const CustomerNotificationEntitySchema = new EntitySchema<CustomerNotificationEntityRecord>({
  name: "CustomerNotification",
  tableName: "customer_notifications",
  columns: {
    id: { type: "uuid", primary: true },
    customerId: { type: "uuid", name: "customer_id" },
    repairOrderId: { type: "uuid", name: "repair_order_id", nullable: true },
    templateKey: { type: String, name: "template_key" },
    recipient: { type: String },
    subject: { type: String },
    status: { type: String },
    errorMessage: { type: String, name: "error_message", nullable: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true }
  }
});
