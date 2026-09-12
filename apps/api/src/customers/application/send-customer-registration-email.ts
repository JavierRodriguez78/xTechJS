import { randomUUID } from "node:crypto";
import { Qualifier, Service } from "@xtaskjs/core";
import { InjectMailerService, type MailerService } from "@xtaskjs/mailer";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Customer } from "../domain/customer.js";
import type { CustomerRegistrationTokenRepository } from "./customer-repository.js";

const REGISTRATION_TOKEN_TTL_HOURS = 72;

@Traceable("SendCustomerRegistrationEmail")
@Service()
export class SendCustomerRegistrationEmail {
  constructor(
    @Qualifier("customerRegistrationTokenRepository") private readonly customerRegistrationTokenRepository: CustomerRegistrationTokenRepository,
    @InjectMailerService() private readonly mailer: MailerService
  ) {}

  async execute(customer: Customer): Promise<void> {
    if (!customer.email) {
      throw new Error("Customer email is required to send the registration invitation");
    }

    const token = randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + REGISTRATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);
    await this.customerRegistrationTokenRepository.createForCustomer(customer.id, token, expiresAt);

    const url = `${process.env.WEB_PUBLIC_URL || "http://localhost:8080"}/customer/register?token=${token}`;
    await this.mailer.sendMail({
      to: customer.email,
      subject: "Completa tu registro en xTechJS",
      text: `Completa tu registro en xTechJS: ${url}\n\nEste enlace expira el ${expiresAt.toISOString()}.`,
      html: `<p>Completa tu registro en xTechJS:</p><p><a href="${url}">${url}</a></p><p>Este enlace expira el ${expiresAt.toISOString()}.</p>`
    });
  }
}
