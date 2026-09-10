import { EntitySchema } from "typeorm";
import type { CashRegister } from "../../domain/cash-register.js";

export const CashRegisterEntitySchema = new EntitySchema<CashRegister>({
  name: "CashRegister",
  tableName: "cash_registers",
  columns: {
    id: { type: "uuid", primary: true }, businessDate: { type: String, name: "business_date", unique: true },
    status: { type: String }, openedAt: { type: "timestamptz", name: "opened_at", createDate: true }, closedAt: { type: "timestamptz", name: "closed_at", nullable: true },
    paidCents: { type: Number, name: "paid_cents", default: 0 }, refundedCents: { type: Number, name: "refunded_cents", default: 0 }, netCents: { type: Number, name: "net_cents", default: 0 }
  }
});
