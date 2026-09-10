import type { CashRegister, OpenCashRegisterInput } from "../domain/cash-register.js";

export interface CashRegisterRepository {
  open(input: OpenCashRegisterInput & { id: string }): Promise<CashRegister>;
  findByDate(businessDate: string): Promise<CashRegister | undefined>;
  close(id: string, totals: Pick<CashRegister, "paidCents" | "refundedCents" | "netCents">): Promise<CashRegister | undefined>;
}
