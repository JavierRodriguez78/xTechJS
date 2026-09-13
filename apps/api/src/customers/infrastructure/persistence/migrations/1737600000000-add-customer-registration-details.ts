import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerRegistrationDetailsMigration implements MigrationInterface {
  name = "AddCustomerRegistrationDetailsMigration1737600000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "registration_status" varchar(32) NOT NULL DEFAULT \'pending\'');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billing_name" varchar(160)');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billing_tax_id" varchar(64)');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billing_address" text');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billing_postal_code" varchar(20)');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billing_city" varchar(120)');
    await queryRunner.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "billing_province" varchar(120)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "billing_province"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "billing_city"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "billing_postal_code"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "billing_address"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "billing_tax_id"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "billing_name"');
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN IF EXISTS "registration_status"');
  }
}