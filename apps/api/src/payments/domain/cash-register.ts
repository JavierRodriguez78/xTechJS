export type CashRegisterStatus = "open" | "closed";

export interface CashRegister {
  id: string;
  businessDate: string;
  status: CashRegisterStatus;
  openedAt: Date;
  closedAt: Date | null;
  paidCents: number;
  refundedCents: number;
  netCents: number;
}

export interface OpenCashRegisterInput { businessDate: string; }
