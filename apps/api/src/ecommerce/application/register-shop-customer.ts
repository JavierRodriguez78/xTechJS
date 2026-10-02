import { hash } from "bcryptjs";
import { randomUUID, createHash } from "node:crypto";
import { Service } from "@xtaskjs/core";
import { DataSource, InjectDataSource } from "@xtaskjs/typeorm";
import { Traceable } from "../../shared/infrastructure/observability/trace.js";
import type { Customer } from "../../customers/domain/customer.js";
import { CustomerEntitySchema } from "../../customers/infrastructure/persistence/customer-entity.js";
import { DataProtectionConsentEntitySchema } from "../../customers/infrastructure/persistence/data-protection-consent-entity.js";
import { UserEntitySchema } from "../../users/infrastructure/persistence/user-entity.js";

export interface RegisterShopCustomerInput {
  displayName: string;
  email: string;
  password: string;
  phone?: string;
  consentText: string;
}

export class ShopRegistrationEmailTakenError extends Error {}
export class ShopRegistrationPasswordError extends Error {}

@Traceable("RegisterShopCustomer")
@Service()
export class RegisterShopCustomer {
  @InjectDataSource()
  private readonly dataSource!: DataSource;

  async execute(input: RegisterShopCustomerInput, ipAddress: string | null): Promise<Customer> {
    const email = input.email.trim().toLowerCase();
    if (input.password.length < 12) throw new ShopRegistrationPasswordError("Password must have at least 12 characters");
    return this.dataSource.transaction(async (manager) => {
      if (await manager.getRepository(CustomerEntitySchema).findOneBy({ email })) throw new ShopRegistrationEmailTakenError("A customer with this email already exists");
      const id = randomUUID();
      const customer = await manager.getRepository(CustomerEntitySchema).save({
        id,
        displayName: input.displayName.trim(),
        email,
        phone: input.phone?.trim() || null,
        address: null,
        taxId: null,
        internalNotes: null,
        registrationStatus: "completed",
        acquisitionChannel: "self_service",
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
      return customer;
    });
  }
}
