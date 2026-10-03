import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { InjectMailerService, type MailerService } from "@xtaskjs/mailer";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { IsNull, MoreThan } from "typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import { CustomerEntitySchema } from "../../customers/infrastructure/persistence/customer-entity.js";
import { ShopRegistrationVerificationTokenEntitySchema } from "../infrastructure/persistence/shop-registration-verification-token-entity.js";

const SHOP_REGISTRATION_TOKEN_TTL_MINUTES = 30;

@Traceable("ShopRegistrationVerification")
@Service()
export class ShopRegistrationVerification {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  constructor(@InjectMailerService() private readonly mailer: MailerService) {}

  async request(emailInput: string): Promise<void> {
    const email = emailInput.trim().toLowerCase();
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + SHOP_REGISTRATION_TOKEN_TTL_MINUTES * 60 * 1000);
    const tokenRecord = await this.dataSource.transaction(async (manager) => {
      if (await manager.getRepository(CustomerEntitySchema).findOneBy({ email })) return null;
      const repository = manager.getRepository(ShopRegistrationVerificationTokenEntitySchema);
      await repository.update({ email, usedAt: IsNull() }, { usedAt: new Date() });
      return repository.save({ id: randomUUID(), email, tokenHash, expiresAt, verifiedAt: null, usedAt: null });
    });
    if (!tokenRecord) return;

    const url = `${process.env.WEB_PUBLIC_URL || "http://localhost:8080"}/shop/register/verify?token=${token}`;
    try {
      await this.mailer.sendMail({
        to: email,
        subject: "Verifica tu correo para crear tu cuenta en xTechJS",
        text: `Para continuar con el registro en xTechJS, verifica tu correo: ${url}\n\nEste enlace caduca en 30 minutos.`,
        html: `<p>Para continuar con el registro en xTechJS, verifica tu correo:</p><p><a href="${url}">Verificar correo</a></p><p>Este enlace caduca en 30 minutos.</p>`
      });
    } catch (error) {
      await this.dataSource.getRepository(ShopRegistrationVerificationTokenEntitySchema).update(tokenRecord.id, { usedAt: new Date() });
      console.warn("[ShopRegistration] Verification email could not be delivered", error);
    }
  }

  async verify(token: string): Promise<string | undefined> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ShopRegistrationVerificationTokenEntitySchema);
      const record = await repository.findOne({ where: { tokenHash, usedAt: IsNull(), expiresAt: MoreThan(new Date()) }, lock: { mode: "pessimistic_write" } });
      if (!record) return undefined;
      if (!record.verifiedAt) await repository.update(record.id, { verifiedAt: new Date() });
      return record.email;
    });
  }
}
