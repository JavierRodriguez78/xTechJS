import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CashRegister } from "../domain/cash-register.js";
import type { CashRegisterRepository } from "./cash-register-repository.js";
import { GetDailyPaymentSummary } from "./get-daily-payment-summary.js";

@Traceable("CloseCashRegister")
@Service()
export class CloseCashRegister {
  constructor(
    @Qualifier("cashRegisterRepository") private readonly repository: CashRegisterRepository,
    private readonly dailySummary: GetDailyPaymentSummary
  ) {}

  async execute(businessDate: string): Promise<CashRegister | undefined> {
    const register = await this.repository.findByDate(businessDate);
    if (!register) return undefined;
    if (register.status === "closed") throw new Error("Cash register is already closed");
    const summary = await this.dailySummary.execute(businessDate);
    return this.repository.close(register.id, {
      paidCents: summary.paidCents,
      refundedCents: summary.refundedCents,
      netCents: summary.netCents
    });
  }
}
