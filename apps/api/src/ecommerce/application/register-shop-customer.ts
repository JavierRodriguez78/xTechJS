import { hash } from "bcryptjs";
import { randomUUID, createHash } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Customer } from "../../customers/domain/customer.js";
import { CustomerEntitySchema } from "../../customers/infrastructure/persistence/customer-entity.js";
import { DataProtectionConsentEntitySchema } from "../../customers/infrastructure/persistence/data-protection-consent-entity.js";
import { UserEntitySchema } from "../../users/infrastructure/persistence/user-entity.js";
import { IsNull, Not } from "typeorm";
import { ShopRegistrationVerificationTokenEntitySchema } from "../infrastructure/persistence/shop-registration-verification-token-entity.js";

export interface RegisterShopCustomerInput {
  displayName: string;
  email: string;
  password: string;
  phone?: string;
  taxId?: string;
  customerType?: "individual" | "business";
  addressStreet?: string;
  addressPostalCode?: string;
  addressCity?: string;
  addressProvince?: string;
  addressCountry?: string;
  billingName?: string;
  billingTaxId?: string;
  billingAddressStreet?: string;
  billingAddressPostalCode?: string;
  billingAddressCity?: string;
  billingAddressProvince?: string;
  billingAddressCountry?: string;
  consentText: string;
}

export class ShopRegistrationEmailTakenError extends Error {}
export class ShopRegistrationPasswordError extends Error {}
export class ShopRegistrationVerificationInvalidError extends Error {}

@Traceable("RegisterShopCustomer")
@Service()
export class RegisterShopCustomer {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async execute(input: RegisterShopCustomerInput, ipAddress: string | null, verificationToken: string): Promise<Customer> {
    const email = input.email.trim().toLowerCase();
    if (input.password.length < 12) throw new ShopRegistrationPasswordError("Password must have at least 12 characters");
    return this.dataSource.transaction(async (manager) => {
      const verificationRepository = manager.getRepository(ShopRegistrationVerificationTokenEntitySchema);
      const verification = await verificationRepository.findOne({ where: { tokenHash: createHash("sha256").update(verificationToken).digest("hex"), email, verifiedAt: Not(IsNull()), usedAt: IsNull() }, lock: { mode: "pessimistic_write" } });
      if (!verification || verification.expiresAt.getTime() <= Date.now()) throw new ShopRegistrationVerificationInvalidError("Email verification is invalid or expired");
      if (await manager.getRepository(CustomerEntitySchema).findOneBy({ email })) throw new ShopRegistrationEmailTakenError("A customer with this email already exists");
      const id = randomUUID();
      const customer = await manager.getRepository(CustomerEntitySchema).save({
        id,
        displayName: input.displayName.trim(),
        email,
        phone: input.phone?.trim() || null,
        address: null,
        addressStreet: input.addressStreet?.trim() || null,
        addressPostalCode: input.addressPostalCode?.trim() || null,
        addressCity: input.addressCity?.trim() || null,
        addressProvince: input.addressProvince?.trim() || null,
        addressCountry: input.addressCountry?.trim() || null,
        taxId: input.taxId?.trim().toUpperCase() || null,
        customerType: input.customerType ?? null,
        internalNotes: null,
        registrationStatus: "completed",
        acquisitionChannel: "self_service",
        billingName: input.billingName?.trim() || null,
        billingTaxId: input.billingTaxId?.trim().toUpperCase() || null,
        billingAddressStreet: input.billingAddressStreet?.trim() || null,
        billingAddressPostalCode: input.billingAddressPostalCode?.trim() || null,
        billingAddressCity: input.billingAddressCity?.trim() || null,
        billingAddressProvince: input.billingAddressProvince?.trim() || null,
        billingAddressCountry: input.billingAddressCountry?.trim() || null,
        tags: []
      });
      await manager.getRepository(UserEntitySchema).save({
        id,
        email,
        displayName: customer.displayName,
        role: "customer",
        active: true,
        passwordHash: await hash(input.password, 12)
      });
      await manager.getRepository(DataProtectionConsentEntitySchema).save({
        id: randomUUID(),
        customerId: id,
        consentText: input.consentText,
        consentVersion: createHash("sha256").update(input.consentText).digest("hex"),
        acceptedAt: new Date(),
        ipAddress
      });
      await verificationRepository.update(verification.id, { usedAt: new Date() });
      return customer;
    });
  }
}
