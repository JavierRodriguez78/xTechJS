import { Qualifier, Service } from "@xtaskjs/core";
import { InjectMailerService, type MailerService } from "@xtaskjs/mailer";
import type { CustomerRepository } from "../../customers/application/customer-repository.js";
import type { RepairOrder } from "../../repairs/domain/repair-order.js";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { renderNotificationTemplate, repairStatusTemplateKey } from "../domain/notification-template.js";
import type { CustomerNotificationRepository } from "./customer-notification-repository.js";
import type { NotificationTemplateRepository } from "./notification-template-repository.js";

export type NotifyRepairStatusChangeOutcome = "sent" | "failed" | "no-template" | "template-disabled" | "no-recipient" | "no-customer";

/**
 * Aplica la plantilla que el administrador haya configurado para el estado al
 * que pasa la reparacion. Si no hay plantilla para ese estado, o esta
 * desactivada, no se envia nada: configurar la plantilla es lo que activa el
 * aviso, no un interruptor aparte.
 */
@Traceable("NotifyRepairStatusChange")
@Service()
export class NotifyRepairStatusChange {
  constructor(
    @Qualifier("notificationTemplateRepository") private readonly templateRepository: NotificationTemplateRepository,
    @Qualifier("customerNotificationRepository") private readonly notificationRepository: CustomerNotificationRepository,
    @Qualifier("customerRepository") private readonly customerRepository: CustomerRepository,
    @InjectMailerService() private readonly mailer: MailerService
  ) {}

  async execute(repair: RepairOrder, note?: string): Promise<NotifyRepairStatusChangeOutcome> {
    const templateKey = repairStatusTemplateKey(repair.status);
    const template = await this.templateRepository.findByKey(templateKey);
    if (!template) return "no-template";
    if (!template.enabled) return "template-disabled";

    const customer = await this.customerRepository.findById(repair.customerId);
    if (!customer) return "no-customer";
    if (!customer.email) return "no-recipient";

    const portalUrl = `${process.env.WEB_PUBLIC_URL || "http://localhost:8080"}/customer`;
    const { subject, body } = renderNotificationTemplate(template, {
      customerName: customer.displayName,
      deviceType: repair.deviceType,
      deviceBrand: repair.brand,
      deviceModel: repair.model,
      reportedIssue: repair.reportedIssue,
      status: repair.status,
      statusNote: note?.trim() ?? "",
      repairId: repair.id,
      portalUrl
    });

    const record = await this.notificationRepository.record({
      customerId: customer.id,
      repairOrderId: repair.id,
      templateKey,
      recipient: customer.email,
      subject,
      status: "pending"
    });

    try {
      await this.mailer.sendMail({ to: customer.email, subject, text: body });
      await this.notificationRepository.markDelivery(record.id, "sent");
      return "sent";
    } catch (error) {
      await this.notificationRepository.markDelivery(record.id, "failed", (error as Error).message);
      return "failed";
    }
  }
}
