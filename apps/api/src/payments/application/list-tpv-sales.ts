import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { EcommerceOrderEntitySchema } from "../../ecommerce/infrastructure/persistence/ecommerce-entity.js";
import { PaymentEntitySchema } from "../infrastructure/persistence/payment-entity.js";

export interface TpvSale {
  id: string;
  source: "repair" | "online";
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

  async execute(): Promise<readonly TpvSale[]> {
    const [repairPayments, onlineOrders] = await Promise.all([
      this.dataSource.getRepository(PaymentEntitySchema).find({ order: { createdAt: "DESC" } }),
      this.dataSource.getRepository(EcommerceOrderEntitySchema).find({
        where: [{ status: "paid" }, { status: "preparing" }, { status: "shipped" }, { status: "delivered" }, { status: "refunded" }],
        order: { createdAt: "DESC" }
      })
    ]);

    return [
      ...repairPayments.map((payment): TpvSale => ({
        id: payment.id,
        source: "repair",
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