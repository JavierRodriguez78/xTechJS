import { InjectMailerService, type MailerService } from "@xtaskjs/mailer";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { CustomerEntitySchema } from "../../customers/infrastructure/persistence/customer-entity.js";
import { EcommerceOrderEntitySchema } from "../infrastructure/persistence/ecommerce-entity.js";
import { GetEcommerceOrderInvoicePdf } from "./get-ecommerce-order-invoice-pdf.js";

@Traceable("SendEcommerceOrderInvoiceEmail")
@Service()
export class SendEcommerceOrderInvoiceEmail {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  constructor(private readonly getInvoicePdf: GetEcommerceOrderInvoicePdf, @InjectMailerService() private readonly mailer: MailerService) {}

  async execute(orderId: string): Promise<{ recipient: string; status: "sent" }> {
    const order = await this.dataSource.getRepository(EcommerceOrderEntitySchema).findOneBy({ id: orderId });
    if (!order || !order.invoiceSeries || !order.invoiceNumber) throw new Error("Ecommerce invoice not found");
    const customer = await this.dataSource.getRepository(CustomerEntitySchema).findOneBy({ id: order.customerId });
    if (!customer?.email) throw new Error("Customer email is required to send the invoice");
    const pdf = await this.getInvoicePdf.execute(orderId);
    if (!pdf) throw new Error("Ecommerce invoice PDF could not be generated");
    const number = `${order.invoiceSeries}-${String(order.invoiceNumber).padStart(6, "0")}`;
    await this.mailer.sendMail({ to: customer.email, subject: `Factura ${number} - xTechJS`, text: `Adjuntamos la factura ${number} correspondiente a tu pedido.`, html: `<p>Adjuntamos la factura <strong>${number}</strong> correspondiente a tu pedido.</p>`, attachments: [{ filename: `factura-${number}.pdf`, content: pdf, contentType: "application/pdf" }] });
    return { recipient: customer.email, status: "sent" };
  }
}
