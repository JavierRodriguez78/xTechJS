import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddEcommerceInvoiceNumberingMigration implements MigrationInterface {
  name = "AddEcommerceInvoiceNumberingMigration1739500000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "ecommerce_orders" ADD COLUMN IF NOT EXISTS "invoice_series" varchar(20)');
    await queryRunner.query('ALTER TABLE "ecommerce_orders" ADD COLUMN IF NOT EXISTS "invoice_number" bigint');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ecommerce_orders_invoice_number" ON "ecommerce_orders" ("invoice_series", "invoice_number") WHERE "invoice_number" IS NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_ecommerce_orders_invoice_number"');
    await queryRunner.query('ALTER TABLE "ecommerce_orders" DROP COLUMN IF EXISTS "invoice_number"');
    await queryRunner.query('ALTER TABLE "ecommerce_orders" DROP COLUMN IF EXISTS "invoice_series"');
  }
}
