import type { MigrationInterface, QueryRunner } from "typeorm";

export class UnifyCustomerAddressesAndShopVerificationMigration1741200000000 implements MigrationInterface {
  name = "UnifyCustomerAddressesAndShopVerificationMigration1741200000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address_street" varchar(500)');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address_postal_code" varchar(20)');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address_city" varchar(120)');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address_province" varchar(120)');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address_country" varchar(120)');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "customer_type" varchar(20)');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billing_address_country" varchar(120)');
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_address')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_address_street') THEN
        ALTER TABLE "customers" RENAME COLUMN "billing_address" TO "billing_address_street";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_postal_code')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_address_postal_code') THEN
        ALTER TABLE "customers" RENAME COLUMN "billing_postal_code" TO "billing_address_postal_code";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_city')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_address_city') THEN
        ALTER TABLE "customers" RENAME COLUMN "billing_city" TO "billing_address_city";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_province')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_address_province') THEN
        ALTER TABLE "customers" RENAME COLUMN "billing_province" TO "billing_address_province";
      END IF;
    END; $$`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "shop_registration_verification_tokens" (
      "id" uuid PRIMARY KEY,
      "email" varchar(320) NOT NULL,
      "token_hash" varchar(64) NOT NULL,
      "expires_at" timestamptz NOT NULL,
      "verified_at" timestamptz,
      "used_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_shop_registration_verification_tokens_hash" ON "shop_registration_verification_tokens" ("token_hash")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_shop_registration_verification_tokens_email_expiry" ON "shop_registration_verification_tokens" ("email", "expires_at")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "shop_registration_verification_tokens"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "billing_address_country"');
    await queryRunner.query('ALTER TABLE "customers" RENAME COLUMN "billing_address_province" TO "billing_province"');
    await queryRunner.query('ALTER TABLE "customers" RENAME COLUMN "billing_address_city" TO "billing_city"');
    await queryRunner.query('ALTER TABLE "customers" RENAME COLUMN "billing_address_postal_code" TO "billing_postal_code"');
    await queryRunner.query('ALTER TABLE "customers" RENAME COLUMN "billing_address_street" TO "billing_address"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "customer_type"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "address_country"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "address_province"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "address_city"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "address_postal_code"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "address_street"');
  }
}
