import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoiceNumberingMigration implements MigrationInterface {
  name = "AddInvoiceNumberingMigration1737700000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SEQUENCE IF NOT EXISTS "invoice_number_seq"');
    await queryRunner.query('ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_series" varchar(20) NOT NULL DEFAULT \'B\'');
    await queryRunner.query('ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_number" bigint');
    await queryRunner.query('UPDATE "payments" SET "invoice_number" = nextval(\'invoice_number_seq\') WHERE "invoice_number" IS NULL');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payments_invoice_number" ON "payments" ("invoice_series", "invoice_number")');
    await queryRunner.query('ALTER SEQUENCE "invoice_number_seq" OWNED BY "payments"."invoice_number"');
    await queryRunner.query('ALTER TABLE "payments" ALTER COLUMN "invoice_number" SET DEFAULT nextval(\'invoice_number_seq\')');
    await queryRunner.query('ALTER TABLE "payments" ALTER COLUMN "invoice_number" SET NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_payments_invoice_number"');
    await queryRunner.query('ALTER TABLE "payments" DROP COLUMN IF EXISTS "invoice_number"');
    await queryRunner.query('ALTER TABLE "payments" DROP COLUMN IF EXISTS "invoice_series"');
    await queryRunner.query('DROP SEQUENCE IF EXISTS "invoice_number_seq"');
  }
}