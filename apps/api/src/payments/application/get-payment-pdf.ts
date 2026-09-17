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
      const totalCents = receipt.payment.documentType === "rectification" ? -receipt.payment.amountCents : receipt.payment.amountCents;
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
      document.moveDown().fontSize(16).text(receipt.payment.documentType === "rectification" ? "FACTURA RECTIFICATIVA" : "FACTURA");
      document.fontSize(10).text(`Serie y numero: ${receipt.receiptNumber}`);
      document.text(`Fecha de expedicion: ${receipt.issuedAt.toLocaleDateString("es-ES")}`);
      if (receipt.payment.originalPaymentId) document.text(`Factura rectificada: ${receipt.payment.originalPaymentId}`);
      if (receipt.payment.rectificationReason) document.text(`Motivo: ${receipt.payment.rectificationReason}`);
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
      const tableLeft = 56;
      const tableWidth = 483;
      const columns = {
        code: { x: 56, width: 52 },
        concept: { x: 108, width: 190 },
        quantity: { x: 298, width: 55 },
        price: { x: 353, width: 60 },
        discount: { x: 413, width: 58 },
        amount: { x: 471, width: 68 }
      };
      document.save().rect(56, tableTop - 4, 483, 24).fill("#087fc1").restore();
      document.fillColor("white").fontSize(7)
        .text("Codigo", columns.code.x, tableTop, { width: columns.code.width })
        .text("Concepto", columns.concept.x, tableTop, { width: columns.concept.width })
        .text("Unidades", columns.quantity.x, tableTop, { width: columns.quantity.width, align: "right" })
        .text("Precio", columns.price.x, tableTop, { width: columns.price.width, align: "right" })
        .text("Dto.", columns.discount.x, tableTop, { width: columns.discount.width, align: "right" })
        .text("Importe", columns.amount.x, tableTop, { width: columns.amount.width, align: "right" });
      document.fillColor("black");
      let rowY = tableTop + 26;
      for (const line of lines) {
        const netCents = Math.round(line.quantity * line.unitPriceCents * (1 - line.discountPercent / 100));
        document.fontSize(8);
        const conceptHeight = document.heightOfString(line.concept, { width: columns.concept.width });
        document.fontSize(8)
          .text(line.code || "", columns.code.x, rowY, { width: columns.code.width, ellipsis: true })
          .text(line.concept, columns.concept.x, rowY, { width: columns.concept.width, height: 36, ellipsis: true })
          .text(line.quantity.toFixed(2), columns.quantity.x, rowY, { width: columns.quantity.width, align: "right" })
          .text(`${(line.unitPriceCents / 100).toFixed(2)}`, columns.price.x, rowY, { width: columns.price.width, align: "right" })
          .text(`${line.discountPercent.toFixed(2)}%`, columns.discount.x, rowY, { width: columns.discount.width, align: "right" })
          .text(`${(netCents / 100).toFixed(2)}`, columns.amount.x, rowY, { width: columns.amount.width, align: "right" });
        rowY += Math.max(20, conceptHeight + 8);
      }
      document.moveTo(tableLeft, rowY + 4).lineTo(tableLeft + tableWidth, rowY + 4).strokeColor("#087fc1").stroke();
      let totalsY = rowY + 14;
      document.fontSize(10).text("Base imponible", 365, totalsY).text(`${(baseCents / 100).toFixed(2)} EUR`, 471, totalsY, { width: 68, align: "right" });
      totalsY += 16;
      for (const [rate, amount] of vatByRate) {
        document.fontSize(9).text(`IVA ${rate.toFixed(2)}%`, 365, totalsY).text(`${(amount / 100).toFixed(2)} EUR`, 471, totalsY, { width: 68, align: "right" });
        totalsY += 14;
      }
      const totalY = totalsY + 4;
      document.save().rect(330, totalY, 209, 28).fill("#087fc1").restore();
      document.fillColor("white").fontSize(13).text("Total factura", 340, totalY + 8).text(`${(totalCents / 100).toFixed(2)} EUR`, 455, totalY + 8, { width: 76, align: "right" });
      document.fillColor("black");
      document.fontSize(10).text(`Forma de pago: ${receipt.payment.method}`);
      if (receipt.payment.reference) document.text(`Referencia de pago: ${receipt.payment.reference}`);
      document.moveDown().fontSize(8).text("Documento generado con los datos fiscales disponibles. Verifique la configuracion del emisor y el tratamiento de IVA antes de emitirlo como factura fiscal.");
      document.end();
    });
  }
}
