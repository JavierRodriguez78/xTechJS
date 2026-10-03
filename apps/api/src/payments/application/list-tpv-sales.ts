import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { EcommerceOrderEntitySchema } from "../../ecommerce/infrastructure/persistence/ecommerce-entity.js";
import { PaymentEntitySchema } from "../infrastructure/persistence/payment-entity.js";

export interface TpvSale {
  id: string;
  source: "repair" | "online";
  repairOrderId: string | null;
  amountCents: number;
  status: "paid" | "refunded";
  method: string;
  reference: string | null;
  invoiceSeries: string;
  invoiceNumber: number;
  createdAt: Date;
}

@Traceable("ListTpvSales")
@Service()
export class ListTpvSales {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async execute(storeIds?: readonly string[] | null): Promise<readonly TpvSale[]> {
    if (storeIds?.length === 0) return [];
    const repairPaymentsPromise = storeIds
      ? this.dataSource.getRepository(PaymentEntitySchema).createQueryBuilder("payment").innerJoin("repair_orders", "repair", "repair.id = payment.repair_order_id").where("repair.store_id IN (:...storeIds)", { storeIds }).orderBy("payment.created_at", "DESC").getMany()
      : this.dataSource.getRepository(PaymentEntitySchema).find({ order: { createdAt: "DESC" } });
    const onlineOrdersPromise = storeIds ? Promise.resolve([]) : this.dataSource.getRepository(EcommerceOrderEntitySchema).find({
        where: [{ status: "paid" }, { status: "preparing" }, { status: "shipped" }, { status: "delivered" }, { status: "refunded" }],
        order: { createdAt: "DESC" }
      });
    const [repairPayments, onlineOrders] = await Promise.all([repairPaymentsPromise, onlineOrdersPromise]);

    return [
      ...repairPayments.map((payment): TpvSale => ({
        id: payment.id,
        source: "repair",
        repairOrderId: payment.repairOrderId,
        amountCents: payment.amountCents,
        status: payment.status,
        method: payment.method,
        reference: payment.reference,
        invoiceSeries: payment.invoiceSeries ?? "B",
        invoiceNumber: payment.invoiceNumber ?? 0,
        createdAt: payment.createdAt
      })),
      ...onlineOrders.map((order): TpvSale => ({
        id: order.id,
        source: "online",
        repairOrderId: null,
        amountCents: order.totalCents,
        status: order.status === "refunded" ? "refunded" : "paid",
        method: "online",
        reference: order.paymentReference,
        invoiceSeries: order.invoiceSeries ?? "E",
        invoiceNumber: order.invoiceNumber ?? 0,
        createdAt: order.createdAt
      }))
    ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}