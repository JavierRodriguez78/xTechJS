import PDFDocument from "pdfkit";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { CustomerEntitySchema } from "../../customers/infrastructure/persistence/customer-entity.js";
import { resolveStoreIssuer } from "../../stores/application/store-issuer.js";
import { EcommerceOrderEntitySchema, EcommerceOrderLineEntitySchema } from "../infrastructure/persistence/ecommerce-entity.js";

@Traceable("GetEcommerceOrderInvoicePdf")
@Service()
export class GetEcommerceOrderInvoicePdf {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async execute(id: string): Promise<Buffer | undefined> {
    const order = await this.dataSource.getRepository(EcommerceOrderEntitySchema).findOneBy({ id });
    if (!order || order.status !== "paid" || !order.invoiceSeries || !order.invoiceNumber) return undefined;
    const [customer, lines] = await Promise.all([
      this.dataSource.getRepository(CustomerEntitySchema).findOneBy({ id: order.customerId }),
      this.dataSource.getRepository(EcommerceOrderLineEntitySchema).find({ where: { orderId: order.id } })
    ]);
    if (!customer) return undefined;
    const issuer = await resolveStoreIssuer(this.dataSource);
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ size: "A4", margin: 56 });
      const chunks: Buffer[] = [];
      document.on("data", (chunk: Buffer) => chunks.push(chunk));
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);
      const number = `${order.invoiceSeries}-${String(order.invoiceNumber).padStart(6, "0")}`;
      document.fontSize(20).text(issuer.legalName);
      document.fontSize(9).text(`NIF: ${issuer.taxId}`);
      document.text(`Domicilio: ${issuer.establishmentAddress}`);
      document.moveDown().fontSize(16).text("FACTURA");
      document.fontSize(10).text(`Serie y numero: ${number}`);
      document.text(`Fecha de expedicion: ${new Date().toLocaleDateString("es-ES")}`);
      document.moveDown().fontSize(11).text("Destinatario");
      document.fontSize(10).text(customer.billingName || customer.displayName);
      if (customer.billingTaxId || customer.taxId) document.text(`NIF/CIF: ${customer.billingTaxId || customer.taxId}`);
      const address = [customer.billingAddressStreet, customer.billingAddressPostalCode, customer.billingAddressCity, customer.billingAddressProvince, customer.billingAddressCountry].filter(Boolean).join(", ");
      if (address) document.text(`Domicilio fiscal: ${address}`);
      if (customer.email) document.text(`Email: ${customer.email}`);
      document.moveDown().fontSize(11).text("Productos");
      for (const line of lines) document.fontSize(10).text(`${line.quantity} x ${line.titleSnapshot} - ${(line.quantity * line.unitPriceCentsSnapshot / 100).toFixed(2)} EUR`);
      document.moveDown().fontSize(14).text(`Total: ${(order.totalCents / 100).toFixed(2)} EUR`, { align: "right" });
      document.fontSize(9).text(`Pago manual${order.paymentReference ? ` · Referencia: ${order.paymentReference}` : ""}`);
      document.end();
    });
  }
}
