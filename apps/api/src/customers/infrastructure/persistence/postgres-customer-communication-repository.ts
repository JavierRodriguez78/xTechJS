import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../../shared/infrastructure/observability/trace.js";
import type { CustomerCommunicationRepository } from "../../application/customer-communication-repository.js";
import type { CustomerCommunication } from "../../domain/customer-communication.js";

@Traceable("PostgresCustomerCommunicationRepository")
@Service({ name: "customerCommunicationRepository" })
export class PostgresCustomerCommunicationRepository implements CustomerCommunicationRepository {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async findByCustomerId(customerId: string): Promise<readonly CustomerCommunication[]> {
    const rows = await this.dataSource.query(`
      SELECT token.id, 'registration_invitation' AS type, customer.email AS recipient,
        token.delivery_status AS status, 'Invitacion de registro' AS subject,
        NULL::varchar AS reference, token.delivery_error AS error_message, token.created_at
      FROM customer_registration_tokens token
      JOIN customers customer ON customer.id = token.customer_id
      WHERE token.customer_id = $1
      UNION ALL
      SELECT email.id, 'invoice_email' AS type, email.recipient, email.status,
        'Factura ' || payment.invoice_series || '-' || LPAD(payment.invoice_number::text, 6, '0') AS subject,
        payment.invoice_series || '-' || LPAD(payment.invoice_number::text, 6, '0') AS reference,
        email.error_message, email.sent_at AS created_at
      FROM invoice_emails email
      JOIN payments payment ON payment.id = email.payment_id
      JOIN repair_orders repair ON repair.id = payment.repair_order_id
      WHERE repair.customer_id = $1
      UNION ALL
      SELECT notification.id, 'repair_notification' AS type, notification.recipient,
        notification.status, notification.subject,
        notification.template_key AS reference, notification.error_message, notification.created_at
      FROM customer_notifications notification
      WHERE notification.customer_id = $1
      ORDER BY created_at DESC
    `, [customerId]) as Record<string, unknown>[];

    return rows.map((row) => ({
      id: String(row.id),
      type: row.type as CustomerCommunication["type"],
      recipient: String(row.recipient),
      status: row.status as CustomerCommunication["status"],
      subject: String(row.subject),
      reference: row.reference ? String(row.reference) : null,
      errorMessage: row.error_message ? String(row.error_message) : null,
      createdAt: new Date(String(row.created_at))
    }));
  }
}