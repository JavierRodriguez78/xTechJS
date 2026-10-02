import PDFDocument from "pdfkit";
import { Qualifier, Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { RepairAttachmentRepository } from "../../attachments/application/repair-attachment-repository.js";
import type { AttachmentStorage } from "../../attachments/application/attachment-storage.js";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import type { InvoiceDraftRepository } from "../../payments/application/invoice-draft-repository.js";
import type { UserRepository } from "../../users/application/user-repository.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import type { RepairStepRepository } from "./repair-step-repository.js";
import { resolveStoreIssuer } from "../../stores/application/store-issuer.js";

async function streamToBuffer(stream: AsyncIterable<Buffer | string>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

@Traceable("GetRepairTechnicalReport")
@Service()
export class GetRepairTechnicalReport {
  @InjectDataSource() private readonly dataSource!: DataSource;

  constructor(
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    @Qualifier("repairStepRepository") private readonly repairStepRepository: RepairStepRepository,
    @Qualifier("repairAttachmentRepository") private readonly attachmentRepository: RepairAttachmentRepository,
    @Qualifier("attachmentStorage") private readonly storage: AttachmentStorage,
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    @Qualifier("userRepository") private readonly userRepository: UserRepository,
    @Qualifier("invoiceDraftRepository") private readonly invoiceDraftRepository: InvoiceDraftRepository
  ) {}

  async execute(repairOrderId: string): Promise<Buffer | undefined> {
    const repair = await this.repairOrderRepository.findById(repairOrderId);
    if (!repair) return undefined;
    const [customer, steps, draft] = await Promise.all([
      this.customerRepository.findById(repair.customerId),
      this.repairStepRepository.listByRepairOrder(repairOrderId),
      this.invoiceDraftRepository.findByRepairOrderId(repairOrderId)
    ]);
    if (!customer) return undefined;
    const issuer = await resolveStoreIssuer(this.dataSource, repair.storeId);
    const attachments = await this.attachmentRepository.listByRepairOrder(repairOrderId);
    return new Promise(async (resolve, reject) => {
      const document = new PDFDocument({ size: "A4", margin: 56 });
      const chunks: Buffer[] = [];
      document.on("data", (chunk: Buffer) => chunks.push(chunk));
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);
      try {
        document.fontSize(20).text(issuer.legalName);
        document.fontSize(9).text(`NIF: ${issuer.taxId}`);
        document.text(`Establecimiento: ${issuer.establishmentAddress}`);
        document.moveDown().fontSize(16).text("INFORME TECNICO DE REPARACION");
        document.fontSize(10).text(`Generado: ${new Date().toLocaleString("es-ES")}`);
        document.moveDown().fontSize(11).text("Reparacion");
        document.fontSize(10).text(`Cliente: ${customer.displayName}`);
        document.text(`Equipo: ${repair.brand} ${repair.model} (${repair.deviceType})`);
        document.text(`Averia reportada: ${repair.reportedIssue}`);
        document.text(`Recepcion: ${repair.createdAt.toLocaleDateString("es-ES")}`);
        if (repair.diagnosis) document.text(`Diagnostico: ${repair.diagnosis}`);
        document.moveDown().fontSize(11).text("Pasos realizados");
        if (!steps.length) document.fontSize(10).text("No se han registrado pasos tecnicos.");
        for (const step of steps) {
          const technician = await this.userRepository.findById(step.technicianId);
          document.moveDown().fontSize(12).text(`${step.sequence}. ${step.title}`);
          document.fontSize(9).text(`${step.performedAt.toLocaleString("es-ES")} - ${technician?.displayName ?? "Tecnico no disponible"}`);
          if (step.description) document.fontSize(10).text(step.description);
          const stepAttachments = attachments.filter((attachment) => attachment.repairStepId === step.id);
          for (const attachment of stepAttachments) {
            if (attachment.mimeType.startsWith("video/")) {
              document.fontSize(9).text(`Video disponible en el portal: ${attachment.fileName}`);
              continue;
            }
            try {
              const buffer = await streamToBuffer(this.storage.read(attachment.storageKey));
              document.moveDown(0.5).image(buffer, { fit: [480, 300] }).moveDown(0.5);
            } catch {
              document.fontSize(9).text(`Imagen disponible en el portal: ${attachment.fileName}`);
            }
          }
        }
        document.addPage().fontSize(11).text("Materiales utilizados");
        if (!draft?.lines.length) document.fontSize(10).text("No hay materiales de almacen asociados.");
        for (const line of draft?.lines ?? []) {
          document.fontSize(10).text(`${line.quantity} x ${line.concept} (${(line.unitPriceCents / 100).toFixed(2)} EUR)`);
        }
        document.moveDown().fontSize(8).text("Los materiales se incluyen como referencia tecnica. Este documento no es una factura.");
        document.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}