import PDFDocument from "pdfkit";
import { Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { loadConfig } from "../../shared/infrastructure/config/app-config.js";
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
      const config = loadConfig();
      const totalCents = receipt.payment.amountCents;
      const lines = receipt.payment.invoiceLines ?? [];
      const baseCents = lines.reduce((total, line) => total + Math.round(line.quantity * line.unitPriceCents * (1 - line.discountPercent / 100)), 0);
      const vatByRate = new Map<number, number>();
      for (const line of lines) {
        const net = Math.round(line.quantity * line.unitPriceCents * (1 - line.discountPercent / 100));
        vatByRate.set(line.taxRate, (vatByRate.get(line.taxRate) ?? 0) + Math.round(net * line.taxRate / 100));
      }
      const vatCents = [...vatByRate.values()].reduce((total, value) => total + value, 0);
      const document = new PDFDocument({ size: "A4", margin: 56 });
      const chunks: Buffer[] = [];
      document.on("data", (chunk: Buffer) => chunks.push(chunk));
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);
      document.fontSize(20).text(config.get("INVOICE_ISSUER_NAME"));
      document.fontSize(9).text(`NIF: ${config.get("INVOICE_ISSUER_TAX_ID")}`);
      document.text(`Domicilio: ${config.get("INVOICE_ISSUER_ADDRESS")}`);
      document.moveDown().fontSize(16).text("FACTURA");
      document.fontSize(10).text(`Serie y numero: ${receipt.receiptNumber}`);
      document.text(`Fecha de expedicion: ${receipt.issuedAt.toLocaleDateString("es-ES")}`);
      document.moveDown().fontSize(11).text("Destinatario");
      document.fontSize(10).text(receipt.customer.billingName || receipt.customer.displayName);
      if (receipt.customer.taxId) document.text(`NIF/CIF: ${receipt.customer.taxId}`);
      const fiscalAddress = [receipt.customer.billingAddress, receipt.customer.billingPostalCode, receipt.customer.billingCity, receipt.customer.billingProvince].filter(Boolean).join(", ");
      if (fiscalAddress) document.text(`Domicilio fiscal: ${fiscalAddress}`);
      if (receipt.customer.email) document.text(`Email: ${receipt.customer.email}`);
      document.moveDown().fontSize(10).text(`Reparacion: ${receipt.repair.brand} ${receipt.repair.model} (${receipt.repair.deviceType})`);
      document.text(`Descripcion: ${receipt.repair.reportedIssue}`);
      document.moveDown();
      const tableTop = document.y;
      const columns = { code: 56, concept: 112, quantity: 360, price: 410, discount: 475, amount: 525 };
      document.save().rect(56, tableTop - 4, 483, 24).fill("#087fc1").restore();
      document.fillColor("white").fontSize(8).text("Codigo", columns.code, tableTop).text("Concepto", columns.concept, tableTop).text("Unidades", columns.quantity, tableTop).text("Precio", columns.price, tableTop).text("Dto.", columns.discount, tableTop).text("Importe", columns.amount, tableTop);
      document.fillColor("black");
      let rowY = tableTop + 26;
      for (const line of lines) {
        const netCents = Math.round(line.quantity * line.unitPriceCents * (1 - line.discountPercent / 100));
        document.fontSize(8).text(line.code || "", columns.code, rowY, { width: 52 }).text(line.concept, columns.concept, rowY, { width: 240 }).text(line.quantity.toFixed(2), columns.quantity, rowY, { width: 42, align: "right" }).text(`${(line.unitPriceCents / 100).toFixed(2)}`, columns.price, rowY, { width: 58, align: "right" }).text(`${line.discountPercent.toFixed(2)}%`, columns.discount, rowY, { width: 45, align: "right" }).text(`${(netCents / 100).toFixed(2)}`, columns.amount, rowY, { width: 55, align: "right" });
        rowY += 20;
      }
      document.moveTo(56, rowY + 4).lineTo(539, rowY + 4).strokeColor("#087fc1").stroke();
      document.fontSize(10).text("Base imponible", 370, rowY + 14).text(`${(baseCents / 100).toFixed(2)} EUR`, 475, rowY + 14, { width: 64, align: "right" });
      for (const [rate, amount] of vatByRate) {
        document.fontSize(9).text(`IVA ${rate.toFixed(2)}%`, 370, document.y + 4).text(`${(amount / 100).toFixed(2)} EUR`, 475, document.y, { width: 64, align: "right" });
      }
      document.save().rect(330, document.y + 18, 209, 28).fill("#087fc1").restore();
      document.fillColor("white").fontSize(13).text("Total factura", 340, document.y + 26).text(`${(totalCents / 100).toFixed(2)} EUR`, 455, document.y + 26, { width: 76, align: "right" });
      document.fillColor("black");
      document.fontSize(10).text(`Forma de pago: ${receipt.payment.method}`);
      if (receipt.payment.reference) document.text(`Referencia de pago: ${receipt.payment.reference}`);
      document.moveDown().fontSize(8).text("Documento generado con los datos fiscales disponibles. Verifique la configuracion del emisor y el tratamiento de IVA antes de emitirlo como factura fiscal.");
      document.end();
    });
  }
}
