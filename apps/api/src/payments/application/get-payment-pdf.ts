import PDFDocument from "pdfkit";
import { Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { GetPaymentReceipt, type PaymentReceipt } from "./get-payment-receipt.js";

@Traceable("GetPaymentPdf")
@Service()
export class GetPaymentPdf {
  constructor(private readonly getPaymentReceipt: GetPaymentReceipt) {}

  async execute(id: string): Promise<Buffer | undefined> {
    const receipt = await this.getPaymentReceipt.execute(id);
    if (!receipt) return undefined;
    return this.render(receipt);
  }

  private render(receipt: PaymentReceipt): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ size: "A4", margin: 56 });
      const chunks: Buffer[] = [];
      document.on("data", (chunk: Buffer) => chunks.push(chunk));
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);
      document.fontSize(20).text("xTechJS", { continued: false });
      document.moveDown().fontSize(12).text("Factura simplificada / recibo");
      document.moveDown().fontSize(10).text(`Numero: ${receipt.receiptNumber}`);
      document.text(`Fecha: ${receipt.issuedAt.toISOString()}`);
      document.moveDown().text(`Cliente: ${receipt.customer.displayName}`);
      if (receipt.customer.email) document.text(`Email: ${receipt.customer.email}`);
      if (receipt.customer.taxId) document.text(`NIF/DNI: ${receipt.customer.taxId}`);
      document.moveDown().text(`Equipo: ${receipt.repair.brand} ${receipt.repair.model} (${receipt.repair.deviceType})`);
      document.text(`Averia: ${receipt.repair.reportedIssue}`);
      document.moveDown().fontSize(14).text(`Importe: ${(receipt.payment.amountCents / 100).toFixed(2)} EUR`);
      document.fontSize(10).text(`Metodo: ${receipt.payment.method}`);
      if (receipt.payment.reference) document.text(`Referencia: ${receipt.payment.reference}`);
      document.end();
    });
  }
}
