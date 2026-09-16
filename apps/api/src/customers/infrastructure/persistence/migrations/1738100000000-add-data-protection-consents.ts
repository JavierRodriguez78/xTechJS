import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddDataProtectionConsentsMigration implements MigrationInterface {
  name = "AddDataProtectionConsentsMigration1738100000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "data_protection_consents" (
      "id" uuid PRIMARY KEY,
      "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
      "consent_text" text NOT NULL,
      "consent_version" varchar(64) NOT NULL,
      "accepted_at" timestamptz NOT NULL,
      "ip_address" varchar(64),
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query('CREATE INDEX "IDX_data_protection_consents_customer" ON "data_protection_consents" ("customer_id", "accepted_at")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "data_protection_consents"');
  }
}
