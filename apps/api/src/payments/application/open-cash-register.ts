import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CashRegister } from "../domain/cash-register.js";
import type { CashRegisterRepository } from "./cash-register-repository.js";

@Traceable("OpenCashRegister")
@Service()
export class OpenCashRegister {
  constructor(@Qualifier("cashRegisterRepository") private readonly repository: CashRegisterRepository) {}
  execute(businessDate: string): Promise<CashRegister> { return this.repository.open({ id: randomUUID(), businessDate }); }
}
