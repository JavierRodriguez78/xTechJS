export interface RepairQuoteLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface RepairQuote {
  id: string;
  repairOrderId: string;
  lines: RepairQuoteLine[];
  totalCents: number;
  status: "draft" | "sent" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveRepairQuoteInput {
  lines: RepairQuoteLine[];
  status: "draft" | "sent";
}