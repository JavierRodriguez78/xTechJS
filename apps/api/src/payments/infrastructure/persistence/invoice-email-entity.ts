import { EntitySchema } from "typeorm";

export interface InvoiceEmailRecord {
  id: string;
  paymentId: string;
  recipient: string;
  status: "sent" | "failed";
  errorMessage: string | null;
  sentAt: Date;
}

export const InvoiceEmailEntitySchema = new EntitySchema<InvoiceEmailRecord>({
  name: "InvoiceEmail",
  tableName: "invoice_emails",
  columns: {
    id: { type: "uuid", primary: true },
    paymentId: { type: "uuid", name: "payment_id" },
    recipient: { type: String },
    status: { type: String },
    errorMessage: { type: String, name: "error_message", nullable: true },
    sentAt: { type: "timestamptz", name: "sent_at", createDate: true }
  }
});