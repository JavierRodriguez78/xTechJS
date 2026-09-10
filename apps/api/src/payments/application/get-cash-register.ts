import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CashRegister } from "../domain/cash-register.js";
import type { CashRegisterRepository } from "./cash-register-repository.js";

@Traceable("GetCashRegister")
@Service()
export class GetCashRegister {
  constructor(@Qualifier("cashRegisterRepository") private readonly repository: CashRegisterRepository) {}
  execute(businessDate: string): Promise<CashRegister | undefined> { return this.repository.findByDate(businessDate); }
}
