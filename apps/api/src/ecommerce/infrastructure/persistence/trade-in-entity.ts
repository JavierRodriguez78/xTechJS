import { EntitySchema } from "typeorm";
import type { TradeInPayout, TradeInRequest } from "../../domain/trade-in-request.js";

export const TradeInRequestEntitySchema = new EntitySchema<TradeInRequest>({
  name: "TradeInRequest", tableName: "trade_in_requests",
  columns: {
    id: { type: "uuid", primary: true }, customerId: { type: "uuid", name: "customer_id" }, deviceType: { type: String, name: "device_type" }, brand: { type: String }, model: { type: String }, conditionDescription: { type: "text", name: "condition_description" }, status: { type: String, default: "draft" }, proposedAmountCents: { type: Number, name: "proposed_amount_cents", nullable: true }, proposalNote: { type: "text", name: "proposal_note", nullable: true }, finalAmountCents: { type: Number, name: "final_amount_cents", nullable: true }, decidedAt: { type: "timestamptz", name: "decided_at", nullable: true }, completedAt: { type: "timestamptz", name: "completed_at", createDate: true }, updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true }
  }
});
export const TradeInPayoutEntitySchema = new EntitySchema<TradeInPayout>({
  name: "TradeInPayout", tableName: "trade_in_payouts",
  columns: { id: { type: "uuid", primary: true }, tradeInRequestId: { type: "uuid", name: "trade_in_request_id" }, amountCents: { type: Number, name: "amount_cents" }, method: { type: String }, reference: { type: String, nullable: true }, paidAt: { type: "timestamptz", name: "paid_at" } }
});
