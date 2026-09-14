import { randomUUID } from "node:crypto";
import { InjectMailerService, type MailerService } from "@xtaskjs/mailer";
import { Qualifier, Service } from "@xtaskjs/core";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { GetPaymentPdf } from "./get-payment-pdf.js";
import { GetPaymentReceipt } from "./get-payment-receipt.js";
import { InvoiceEmailEntitySchema } from "../infrastructure/persistence/invoice-email-entity.js";
import { InjectDataSource, type DataSource } from "@xtaskjs/typeorm";

@Traceable("SendPaymentInvoiceEmail")
@Service()
export class SendPaymentInvoiceEmail {
  constructor(
    private readonly getPaymentReceipt: GetPaymentReceipt,
    private readonly getPaymentPdf: GetPaymentPdf,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectMailerService() private readonly mailer: MailerService,
    @Qualifier("invoiceEmailRepository") private readonly invoiceEmailRepository: InvoiceEmailRepository
  ) {}

  async execute(paymentId: string): Promise<{ recipient: string; status: "sent" }> {
    const receipt = await this.getPaymentReceipt.execute(paymentId);
    if (!receipt) throw new Error("Payment not found");
    if (!receipt.customer.email) throw new Error("Customer email is required to send the invoice");
    const pdf = await this.getPaymentPdf.execute(paymentId);
    if (!pdf) throw new Error("Invoice PDF could not be generated");

    try {
      await this.mailer.sendMail({
        to: receipt.customer.email,
        subject: `Factura ${receipt.receiptNumber} - xTechJS`,
        text: `Adjuntamos la factura ${receipt.receiptNumber} correspondiente a tu reparación.`,
        html: `<p>Adjuntamos la factura <strong>${receipt.receiptNumber}</strong> correspondiente a tu reparación.</p>`,
        attachments: [{ filename: `factura-${receipt.receiptNumber}.pdf`, content: pdf, contentType: "application/pdf" }]
      });
      await this.invoiceEmailRepository.create({ id: randomUUID(), paymentId, recipient: receipt.customer.email, status: "sent", errorMessage: null });
      return { recipient: receipt.customer.email, status: "sent" };
    } catch (error) {
      await this.invoiceEmailRepository.create({ id: randomUUID(), paymentId, recipient: receipt.customer.email, status: "failed", errorMessage: (error as Error).message });
      throw error;
    }
  }
}

interface InvoiceEmailRepository {
  create(input: { id: string; paymentId: string; recipient: string; status: "sent" | "failed"; errorMessage: string | null }): Promise<void>;
}