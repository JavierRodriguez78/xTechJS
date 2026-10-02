import PDFDocument from "pdfkit";
import { Qualifier, Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import { resolveStoreIssuer } from "../../stores/application/store-issuer.js";
import { RepairConditionRecordEntitySchema } from "../infrastructure/persistence/repair-order-entity.js";
import type { RepairOrderRepository } from "./repair-order-repository.js";
import type { RepairQuoteRepository } from "./repair-quote-repository.js";

@Traceable("GetRepairReceipt")
@Service()
export class GetRepairReceipt {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  constructor(
    @Qualifier("repairOrderRepository") private readonly repairOrderRepository: RepairOrderRepository,
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    @Qualifier("repairQuoteRepository") private readonly quoteRepository: RepairQuoteRepository
  ) {}

  async execute(repairOrderId: string): Promise<Buffer | undefined> {
    const repair = await this.repairOrderRepository.findById(repairOrderId);
    if (!repair) return undefined;
    const [customer, quote, condition] = await Promise.all([
      this.customerRepository.findById(repair.customerId),
      this.quoteRepository.findByRepairOrderId(repairOrderId),
      this.dataSource.getRepository(RepairConditionRecordEntitySchema).findOneBy({ repairOrderId, phase: "pre_repair" })
    ]);
    if (!customer) return undefined;
    const issuer = await resolveStoreIssuer(this.dataSource, repair.storeId);

    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ size: "A4", margin: 56 });
      const chunks: Buffer[] = [];
      document.on("data", (chunk: Buffer) => chunks.push(chunk));
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);
      try {
        document.fontSize(20).text(issuer.legalName);
        document.fontSize(9).text(`NIF: ${issuer.taxId}`);
        document.text(`Establecimiento: ${issuer.establishmentAddress}`);
        document.moveDown().fontSize(16).text("RESGUARDO DE DEPOSITO");
        document.fontSize(10).text(`Fecha de recepcion: ${repair.createdAt.toLocaleString("es-ES")}`);
        document.text(`Referencia: ${repair.id.slice(0, 8)}`);
        document.moveDown().fontSize(11).text("Cliente y equipo");
        document.fontSize(10).text(`Cliente: ${customer.displayName}`);
        document.text(`Equipo: ${repair.brand} ${repair.model} (${repair.deviceType})`);
        if (repair.serialNumber) document.text(`Numero de serie: ${repair.serialNumber}`);
        document.text(`Averia reportada: ${repair.reportedIssue}`);
        if (repair.deliveredAccessories) document.text(`Accesorios entregados: ${repair.deliveredAccessories}`);
        if (repair.estimatedCompletionAt) document.text(`Fecha estimada: ${repair.estimatedCompletionAt.toLocaleString("es-ES")}`);
        document.moveDown().fontSize(11).text("Estado previo del equipo");
        if (!condition) document.fontSize(10).text("No se ha registrado checklist previo.");
        else {
          for (const item of condition.checklist.items) document.fontSize(10).text(`${item.ok ? "Correcto" : "Incidencia"}: ${item.label}`);
          if (condition.checklist.notes) document.moveDown(0.5).text(`Observaciones: ${condition.checklist.notes}`);
        }
        document.moveDown().fontSize(11).text("Presupuesto orientativo");
        if (!quote) document.fontSize(10).text("No se ha registrado presupuesto inicial.");
        else {
          for (const line of quote.lines) document.fontSize(10).text(`${line.quantity} x ${line.description}: ${(line.quantity * line.unitPriceCents / 100).toFixed(2)} EUR`);
          document.moveDown(0.5).fontSize(11).text(`Total orientativo: ${(quote.totalCents / 100).toFixed(2)} EUR`);
        }
        document.moveDown().fontSize(8).text("Este resguardo acredita la recepción del equipo y no constituye una factura.");
        document.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}