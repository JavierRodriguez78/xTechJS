import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { CashRegister, OpenCashRegisterInput } from "../../domain/cash-register.js";
import type { CashRegisterRepository } from "../../application/cash-register-repository.js";
import { CashRegisterEntitySchema } from "./cash-register-entity.js";

@Traceable("PostgresCashRegisterRepository")
@Service({ name: "cashRegisterRepository" })
export class PostgresCashRegisterRepository implements CashRegisterRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;
  open(input: OpenCashRegisterInput & { id: string }): Promise<CashRegister> { return this.dataSource.getRepository(CashRegisterEntitySchema).save({ ...input, status: "open", closedAt: null, paidCents: 0, refundedCents: 0, netCents: 0 }); }
  findByDate(businessDate: string): Promise<CashRegister | undefined> { return this.dataSource.getRepository(CashRegisterEntitySchema).findOneBy({ businessDate }).then((register) => register ?? undefined); }
  async close(id: string, totals: Pick<CashRegister, "paidCents" | "refundedCents" | "netCents">): Promise<CashRegister | undefined> { const repository = this.dataSource.getRepository(CashRegisterEntitySchema); const register = await repository.findOneBy({ id }); if (!register) return undefined; Object.assign(register, totals, { status: "closed", closedAt: new Date() }); return repository.save(register); }
}
