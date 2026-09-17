import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoiceRectificationsMigration implements MigrationInterface {
  name = "AddInvoiceRectificationsMigration1738500000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "rectification_invoice_number_seq"`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "document_type" varchar(32) NOT NULL DEFAULT 'invoice'`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "original_payment_id" uuid REFERENCES "payments"("id")`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "rectification_reason" varchar(500)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_payments_original_rectification" ON "payments" ("original_payment_id") WHERE "original_payment_id" IS NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_payments_original_rectification"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "rectification_reason"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "original_payment_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "document_type"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "rectification_invoice_number_seq"`);
  }
}