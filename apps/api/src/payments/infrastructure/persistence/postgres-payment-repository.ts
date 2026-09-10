import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { CreatePaymentInput, Payment } from "../../domain/payment.js";
import type { PaymentReceiptData, PaymentReportRow, PaymentRepository } from "../../application/payment-repository.js";
import { PaymentEntitySchema } from "./payment-entity.js";

@Traceable("PostgresPaymentRepository")
@Service({ name: "paymentRepository" })
export class PostgresPaymentRepository implements PaymentRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;
  create(input: CreatePaymentInput & { id: string }): Promise<Payment> { return this.dataSource.getRepository(PaymentEntitySchema).save({ ...input, status: "paid" }); }
  findAll(): Promise<readonly Payment[]> { return this.dataSource.getRepository(PaymentEntitySchema).find({ order: { createdAt: "DESC" } }); }
  findByRepairOrderId(repairOrderId: string): Promise<readonly Payment[]> { return this.dataSource.getRepository(PaymentEntitySchema).find({ where: { repairOrderId }, order: { createdAt: "DESC" } }); }
  async refund(id: string): Promise<Payment | undefined> {
    const repository = this.dataSource.getRepository(PaymentEntitySchema);
    const payment = await repository.findOneBy({ id });
    if (!payment) return undefined;
    if (payment.status === "refunded") throw new Error("Payment is already refunded");
    payment.status = "refunded";
    return repository.save(payment);
  }

  async findReportRows(from: Date, to: Date): Promise<readonly PaymentReportRow[]> {
    const rows = await this.dataSource.query(`SELECT p.*, r.technician_id, r.device_type FROM payments p JOIN repair_orders r ON r.id = p.repair_order_id WHERE p.created_at BETWEEN $1 AND $2 ORDER BY p.created_at ASC`, [from, to]);
    return rows.map((row: Record<string, unknown>) => ({
      payment: { id: String(row.id), repairOrderId: String(row.repair_order_id), amountCents: Number(row.amount_cents), method: row.method as Payment["method"], status: row.status as Payment["status"], reference: row.reference ? String(row.reference) : null, createdAt: new Date(String(row.created_at)) },
      technicianId: row.technician_id ? String(row.technician_id) : null,
      deviceType: String(row.device_type)
    }));
  }

  async findReceiptData(id: string): Promise<PaymentReceiptData | undefined> {
    const rows = await this.dataSource.query(`SELECT p.*, r.device_type, r.brand, r.model, r.reported_issue, c.display_name, c.email, c.tax_id FROM payments p JOIN repair_orders r ON r.id = p.repair_order_id JOIN customers c ON c.id = r.customer_id WHERE p.id = $1`, [id]);
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      payment: { id: String(row.id), repairOrderId: String(row.repair_order_id), amountCents: Number(row.amount_cents), method: row.method as Payment["method"], status: row.status as Payment["status"], reference: row.reference ? String(row.reference) : null, createdAt: new Date(String(row.created_at)) },
      repair: { id: String(row.repair_order_id), deviceType: String(row.device_type), brand: String(row.brand), model: String(row.model), reportedIssue: String(row.reported_issue) },
      customer: { displayName: String(row.display_name), email: row.email ? String(row.email) : null, taxId: row.tax_id ? String(row.tax_id) : null }
    };
  }
}
