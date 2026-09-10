import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { CreatePaymentInput, Payment } from "../../domain/payment.js";
import type { PaymentRepository } from "../../application/payment-repository.js";
import { PaymentEntitySchema } from "./payment-entity.js";

@Traceable("PostgresPaymentRepository")
@Service({ name: "paymentRepository" })
export class PostgresPaymentRepository implements PaymentRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;
  create(input: CreatePaymentInput & { id: string }): Promise<Payment> { return this.dataSource.getRepository(PaymentEntitySchema).save({ ...input, status: "paid" }); }
  findAll(): Promise<readonly Payment[]> { return this.dataSource.getRepository(PaymentEntitySchema).find({ order: { createdAt: "DESC" } }); }
  findByRepairOrderId(repairOrderId: string): Promise<readonly Payment[]> { return this.dataSource.getRepository(PaymentEntitySchema).find({ where: { repairOrderId }, order: { createdAt: "DESC" } }); }
}
