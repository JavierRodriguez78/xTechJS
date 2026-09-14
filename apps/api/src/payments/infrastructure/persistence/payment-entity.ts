import { EntitySchema } from "typeorm";
import type { Payment } from "../../domain/payment.js";

export const PaymentEntitySchema = new EntitySchema<Payment>({
  name: "Payment",
  tableName: "payments",
  columns: {
    id: { type: "uuid", primary: true }, repairOrderId: { type: "uuid", name: "repair_order_id" }, amountCents: { type: Number, name: "amount_cents" },
    method: { type: String }, status: { type: String, default: "paid" }, reference: { type: String, nullable: true },
    invoiceLines: { type: "jsonb", name: "invoice_lines", default: [] },
    invoiceSeries: { type: String, name: "invoice_series", default: "B" }, invoiceNumber: { type: Number, name: "invoice_number", unique: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true }
  }
});
