export interface AutomaticInvoiceLine {
  sourceMovementId: string;
  code: string;
  concept: string;
  quantity: number;
  unitPriceCents: number;
  discountPercent: number;
  taxRate: number;
}

export interface InvoiceDraft {
  id: string;
  repairOrderId: string;
  lines: AutomaticInvoiceLine[];
  status: "draft";
  createdAt: Date;
  updatedAt: Date;
}
