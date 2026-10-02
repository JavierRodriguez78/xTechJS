export type TradeInDeviceType = "console" | "retro_console" | "game" | "phone" | "tablet" | "other";
export type TradeInStatus = "draft" | "submitted" | "in_review" | "proposal_sent" | "accepted" | "rejected" | "completed" | "cancelled";
export type TradeInPayoutMethod = "bank_transfer" | "cash";

export interface TradeInRequest {
  id: string;
  customerId: string;
  deviceType: TradeInDeviceType;
  brand: string;
  model: string;
  conditionDescription: string;
  status: TradeInStatus;
  proposedAmountCents: number | null;
  proposalNote: string | null;
  finalAmountCents: number | null;
  decidedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeInPayout { id: string; tradeInRequestId: string; amountCents: number; method: TradeInPayoutMethod; reference: string | null; paidAt: Date; }
