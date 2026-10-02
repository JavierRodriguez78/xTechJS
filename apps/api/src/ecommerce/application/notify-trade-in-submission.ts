import { Service } from "@xtaskjs/core";
import { InjectMailerService, type MailerService } from "@xtaskjs/mailer";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import type { UserCredentials } from "../../users/domain/user.js";
import { UserEntitySchema } from "../../users/infrastructure/persistence/user-entity.js";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { TradeInRequest } from "../domain/trade-in-request.js";

@Traceable("NotifyTradeInSubmission")
@Service()
export class NotifyTradeInSubmission {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  constructor(@InjectMailerService() private readonly mailer: MailerService) {}

  async execute(request: TradeInRequest): Promise<void> {
    const recipients = await this.dataSource.getRepository(UserEntitySchema).find({
      where: [{ active: true, role: "admin" }, { active: true, role: "technician" }],
      select: { email: true } as Partial<Record<keyof UserCredentials, boolean>>
    });
    const subject = `Nueva solicitud de compraventa: ${request.brand} ${request.model}`;
    const text = `Hay una nueva solicitud de valoración para ${request.deviceType} ${request.brand} ${request.model}. Revísala en Compraventa.`;

    await Promise.allSettled(recipients.map((recipient) => this.mailer.sendMail({ to: recipient.email, subject, text })));
  }
}